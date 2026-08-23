import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { tgSend, tgConfigured } from "@/lib/telegram";
import bcrypt from "bcryptjs";

/**
 * Klinika (va admin) parolini o'zi tiklashi.
 *
 * Kirmagan foydalanuvchi uchun mo'ljallangan, shuning uchun himoya qattiqroq:
 *  - kod FAQAT hisobga ulangan Telegram chatiga boradi, boshqa yo'l yo'q
 *  - login mavjudmi-yo'qmi degan ma'lumot oshkor qilinmaydi (login enumeration)
 *  - IP va login bo'yicha alohida chegara
 *
 * Telegram ulanmagan bo'lsa — administratorga murojaat qilish kerak.
 * Bu ataylab: bot ulanmagan hisobda o'zini tiklash yo'li bo'lsa,
 * u eng zaif nuqtaga aylanardi.
 */

const OTP_KEY = (userId: string) => `pwreset:${userId}`;

/** Har doim bir xil javob — login bor-yo'qligini bildirmaslik uchun */
const VAGUE_OK = {
  ok: true,
  message:
    "Agar bunday login mavjud bo'lsa va Telegram botga ulangan bo'lsa — " +
    "kod o'sha yerga yuborildi.",
};

/** 1-qadam: kod so'rash */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  if (!username) return NextResponse.json({ error: "Loginni kiriting" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`pwreset:ip:${ip}`, 10, 60 * 60 * 1000) || !rateLimit(`pwreset:u:${username}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Juda ko'p urinish. Bir soatdan keyin urining." }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { username } });

  // Hisob yo'q, bloklangan, o'chirilgan yoki bot ulanmagan —
  // hammasida BIR XIL javob qaytadi
  if (!user || user.blockedAt || user.deletedAt || !user.telegramChatId || !tgConfigured()) {
    if (user) {
      audit({
        actorRole: "SYSTEM", actorName: username,
        action: "PASSWORD_RESET_BLOCKED", entity: "User", entityId: user.id,
        meta: { reason: user.blockedAt ? "blocked" : user.deletedAt ? "deleted" : "no_telegram", ip },
      });
    }
    return NextResponse.json(VAGUE_OK);
  }

  const code = String(100000 + Math.floor(Math.random() * 900000)).slice(0, 6);
  await db.otpCode.create({
    data: {
      phone: OTP_KEY(user.id),
      code,
      channel: "TELEGRAM",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await tgSend(
    user.telegramChatId,
    `🔑 <b>Parolni tiklash</b>\n\nLogin: <code>${username}</code>\n` +
    `Tasdiqlash kodi: <code>${code}</code>\n\n` +
    `Kod 10 daqiqa amal qiladi. Agar buni siz so'ramagan bo'lsangiz — ` +
    `kodni HECH KIMGA bermang va administratorga xabar bering.`
  );

  audit({
    actorRole: "SYSTEM", actorName: username,
    action: "PASSWORD_RESET_REQUEST", entity: "User", entityId: user.id, meta: { ip },
  });

  return NextResponse.json(VAGUE_OK);
}

/** 2-qadam: kod bilan yangi parolni o'rnatish */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const code = String(body.code ?? "").trim();
  const password = String(body.password ?? "");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`pwset:ip:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });
  }

  if (password.length < 10) {
    return NextResponse.json({ error: "Parol kamida 10 belgi bo'lsin" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { username } });
  if (!user || user.blockedAt || user.deletedAt) {
    return NextResponse.json({ error: "Kod noto'g'ri yoki muddati tugagan" }, { status: 400 });
  }

  const otp = await db.otpCode.findFirst({
    where: { phone: OTP_KEY(user.id), usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= 5) {
    return NextResponse.json({ error: "Kod noto'g'ri yoki muddati tugagan" }, { status: 400 });
  }
  if (otp.code !== code) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "Kod noto'g'ri" }, { status: 400 });
  }

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
    db.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
    // Eskisi bilan boshlangan barcha tiklash so'rovlari bekor bo'ladi
    db.otpCode.updateMany({
      where: { phone: OTP_KEY(user.id), usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  audit({
    actorId: user.id, actorRole: user.role, actorName: username,
    action: "PASSWORD_RESET_DONE", entity: "User", entityId: user.id, meta: { ip },
  });

  if (user.telegramChatId) {
    void tgSend(
      user.telegramChatId,
      "✅ Parolingiz yangilandi. Bu siz bo'lmasangiz — darhol administratorga murojaat qiling."
    );
  }

  return NextResponse.json({ ok: true });
}
