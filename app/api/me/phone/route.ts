import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { sendSms, smsConfigured } from "@/lib/sms";
import { tgConfigured } from "@/lib/telegram";
import { rateLimit } from "@/lib/ratelimit";
import { screenCodeAllowed, NO_CHANNEL_ERROR } from "@/lib/otp-channel";
import { audit } from "@/lib/audit";

/** Telefon raqamini almashtirish: yangi raqamga kod yuborish */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const newPhone = normalizePhone(String(body.newPhone ?? ""));
  if (!newPhone) return NextResponse.json({ error: "Raqam noto'g'ri" }, { status: 400 });
  if (newPhone === user.phone) return NextResponse.json({ error: "Bu sizning joriy raqamingiz" }, { status: 400 });

  const taken = await db.user.findUnique({ where: { phone: newPhone } });
  if (taken) return NextResponse.json({ error: "Bu raqam boshqa hisobga bog'langan" }, { status: 409 });

  if (!rateLimit(`phchg:${user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });
  }

  const code = String(100000 + Math.floor(Math.random() * 900000)).slice(0, 6);

  // Yangi raqam hali hech kimga tegishli emas — bot orqali egaligini tasdiqlatamiz
  if (tgConfigured()) {
    const tgToken = "t" + Math.random().toString(36).slice(2, 12);
    await db.otpCode.create({
      data: { phone: newPhone, code, channel: "TG_LINK", tgToken, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    return NextResponse.json({
      ok: true,
      via: "telegram_link",
      deepLink: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=otp_${tgToken}`,
      botUsername: process.env.TELEGRAM_BOT_USERNAME,
    });
  }

  await db.otpCode.create({
    data: { phone: newPhone, code, channel: smsConfigured() ? "SMS" : "SCREEN", expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });

  if (smsConfigured()) {
    const sent = await sendSms(newPhone, `StomGo kirish kodi: ${code}. Uni hech kimga bermang.`);
    if (!sent) return NextResponse.json({ error: "SMS yuborilmadi" }, { status: 502 });
    return NextResponse.json({ ok: true, via: "sms" });
  }
  if (!screenCodeAllowed()) {
    return NextResponse.json({ error: NO_CHANNEL_ERROR }, { status: 503 });
  }
  return NextResponse.json({ ok: true, via: "screen", devCode: code });
}

/** Yangi raqamni kod bilan tasdiqlash va almashtirish */
export async function PUT(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const newPhone = normalizePhone(String(body.newPhone ?? ""));
  const code = String(body.code ?? "").trim();
  if (!newPhone || code.length !== 6) return NextResponse.json({ error: "Ma'lumot noto'g'ri" }, { status: 400 });

  const otp = await db.otpCode.findFirst({
    where: { phone: newPhone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= 5) {
    return NextResponse.json({ error: "Kod topilmadi yoki urinishlar tugadi" }, { status: 400 });
  }
  if (otp.code !== code) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "Kod noto'g'ri" }, { status: 400 });
  }

  const taken = await db.user.findUnique({ where: { phone: newPhone } });
  if (taken) return NextResponse.json({ error: "Bu raqam band bo'lib qoldi" }, { status: 409 });

  await db.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  await db.user.update({ where: { id: user.id }, data: { phone: newPhone } });
  audit({ actorId: user.id, actorRole: user.role, actorName: user.name ?? newPhone, action: "PHONE_CHANGE", entity: "User", entityId: user.id, meta: { from: user.phone, to: newPhone } });
  return NextResponse.json({ ok: true, phone: newPhone });
}
