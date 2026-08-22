import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { sendSms, smsConfigured } from "@/lib/sms";
import { tgConfigured, tgSend } from "@/lib/telegram";
import { rateLimit } from "@/lib/ratelimit";

/**
 * Kirish kodi yuborish. Ustuvorlik:
 *  1) TELEGRAM  — foydalanuvchi botga ulangan bo'lsa, kod botiga boradi (bepul)
 *  2) TG_LINK   — ulanmagan bo'lsa, botda raqamini tasdiqlash havolasi qaytadi;
 *                 bot raqam mosligini tekshirib, kodni o'sha yerda beradi
 *  3) SMS       — bot sozlanmagan, lekin Eskiz ulangan bo'lsa
 *  4) SCREEN    — hech biri yo'q (faqat lokal ishlab chiqish): kod ekranda
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) {
    return NextResponse.json({ error: "Telefon raqami noto'g'ri. Masalan: 90 123 45 67" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`otp:phone:${phone}`, 5, 15 * 60 * 1000) || !rateLimit(`otp:ip:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Juda ko'p urinish. Birozdan keyin qayta urining." }, { status: 429 });
  }

  const code = String(100000 + Math.floor(Math.random() * 900000)).slice(0, 6);

  if (tgConfigured()) {
    const user = await db.user.findUnique({ where: { phone } });

    if (user?.telegramChatId) {
      await db.otpCode.create({
        data: { phone, code, channel: "TELEGRAM", expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      });
      const sent = await tgSend(
        user.telegramChatId,
        `🔐 StomGo kirish kodingiz: <code>${code}</code>\n\nUni hech kimga bermang. 5 daqiqa amal qiladi.`
      );
      if (sent) return NextResponse.json({ ok: true, via: "telegram" });
      // Chat o'chirilgan/bloklangan bo'lsa — havola oqimiga o'tamiz
    }

    // Botda raqamni tasdiqlash havolasi
    const tgToken = "t" + Math.random().toString(36).slice(2, 12);
    await db.otpCode.create({
      data: { phone, code, channel: "TG_LINK", tgToken, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    return NextResponse.json({
      ok: true,
      via: "telegram_link",
      deepLink: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=otp_${tgToken}`,
      botUsername: process.env.TELEGRAM_BOT_USERNAME,
    });
  }

  await db.otpCode.create({
    data: { phone, code, channel: smsConfigured() ? "SMS" : "SCREEN", expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });

  if (smsConfigured()) {
    const sent = await sendSms(phone, `StomGo kirish kodi: ${code}. Uni hech kimga bermang.`);
    if (!sent) return NextResponse.json({ error: "SMS yuborilmadi. Birozdan keyin qayta urining." }, { status: 502 });
    return NextResponse.json({ ok: true, via: "sms" });
  }

  // Faqat lokal ishlab chiqish rejimi
  return NextResponse.json({ ok: true, via: "screen", devCode: code });
}
