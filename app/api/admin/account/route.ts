import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { tgSend, tgConfigured } from "@/lib/telegram";
import bcrypt from "bcryptjs";

/**
 * Admin o'z login va parolini o'zgartiradi.
 * Har qanday o'zgarish Telegram botga kelgan kod bilan tasdiqlanadi —
 * hisob o'g'irlansa ham, botga kirmagan odam parolni o'zgartira olmaydi.
 */

/** 1-qadam: o'zgarishni boshlash, botga kod yuborish */
export async function POST(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  if (!rateLimit(`admacc:${admin.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Juda ko'p urinish. Bir soatdan keyin urining." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const currentPassword = String(body.currentPassword ?? "");

  // Joriy parol majburiy — brauzer ochiq qolib ketgan bo'lsa ham himoya
  if (!admin.passwordHash || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    return NextResponse.json({ error: "Joriy parol noto'g'ri" }, { status: 403 });
  }

  if (!username && !password) {
    return NextResponse.json({ error: "Login yoki yangi parolni kiriting" }, { status: 400 });
  }
  if (username) {
    if (!/^[a-z0-9_]{4,30}$/.test(username)) {
      return NextResponse.json(
        { error: "Login 4-30 belgi: kichik lotin harflar, raqam va _ " },
        { status: 400 }
      );
    }
    const taken = await db.user.findFirst({ where: { username, id: { not: admin.id } } });
    if (taken) return NextResponse.json({ error: `"${username}" band` }, { status: 409 });
  }
  if (password && password.length < 10) {
    return NextResponse.json({ error: "Parol kamida 10 belgi bo'lsin" }, { status: 400 });
  }

  if (!admin.telegramChatId || !tgConfigured()) {
    return NextResponse.json(
      { error: "Avval Telegram botga ulaning — tasdiqlash kodi o'sha yerga keladi" },
      { status: 400 }
    );
  }

  const code = String(100000 + Math.floor(Math.random() * 900000)).slice(0, 6);
  // Kodni OtpCode jadvalida saqlaymiz; "phone" maydoni kalit sifatida ishlatiladi
  await db.otpCode.create({
    data: {
      phone: `admacc:${admin.id}`,
      code,
      channel: "TELEGRAM",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const parts = [
    username ? `Login: <b>${username}</b>` : null,
    password ? "Parol: <b>yangilanadi</b>" : null,
  ].filter(Boolean).join("\n");

  await tgSend(
    admin.telegramChatId,
    `🔐 <b>Admin hisobini o'zgartirish</b>\n\n${parts}\n\nTasdiqlash kodi: <code>${code}</code>\n\n` +
    `Agar bu siz bo'lmasangiz — kodni HECH KIMGA bermang va parolni darhol o'zgartiring.`
  );

  audit({
    actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin",
    action: "ADMIN_ACCOUNT_REQUEST", entity: "User", entityId: admin.id,
    meta: { username: username || undefined, passwordChange: !!password },
  });

  return NextResponse.json({ ok: true, via: "telegram" });
}

/** 2-qadam: kod bilan tasdiqlash va saqlash */
export async function PUT(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const otp = await db.otpCode.findFirst({
    where: { phone: `admacc:${admin.id}`, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return NextResponse.json({ error: "Kod muddati tugagan. Qaytadan boshlang." }, { status: 400 });

  if (otp.attempts >= 5) {
    return NextResponse.json({ error: "Juda ko'p noto'g'ri urinish. Qaytadan boshlang." }, { status: 429 });
  }
  if (otp.code !== code) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "Kod noto'g'ri" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (username) {
    if (!/^[a-z0-9_]{4,30}$/.test(username)) {
      return NextResponse.json({ error: "Login formati noto'g'ri" }, { status: 400 });
    }
    const taken = await db.user.findFirst({ where: { username, id: { not: admin.id } } });
    if (taken) return NextResponse.json({ error: `"${username}" band` }, { status: 409 });
    data.username = username;
  }
  if (password) {
    if (password.length < 10) return NextResponse.json({ error: "Parol kamida 10 belgi" }, { status: 400 });
    data.passwordHash = await bcrypt.hash(password, 10);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "O'zgartirish uchun maydon yo'q" }, { status: 400 });
  }

  await db.$transaction([
    db.user.update({ where: { id: admin.id }, data }),
    db.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
  ]);

  audit({
    actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin",
    action: "ADMIN_ACCOUNT_CHANGE", entity: "User", entityId: admin.id,
    meta: { fields: Object.keys(data) },
  });

  if (admin.telegramChatId) {
    void tgSend(admin.telegramChatId, "✅ Admin hisobi yangilandi. Bu siz bo'lmasangiz — darhol bog'laning.");
  }

  return NextResponse.json({ ok: true });
}
