import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { limitWrite } from "@/lib/ratelimit";
import { requireUser, unauthorized } from "@/lib/auth";
import { tgConfigured } from "@/lib/telegram";
import { audit } from "@/lib/audit";

function genCode(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

/** Joriy foydalanuvchi (bemor yoki klinika) uchun Telegram ulash kodi va holati */
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
  const configured = tgConfigured();

  if (user.role === "CLINIC" && user.clinicId) {
    const clinic = await db.clinic.findUnique({ where: { id: user.clinicId } });
    if (!clinic) return unauthorized();
    let code = clinic.tgLinkCode;
    if (!code) {
      code = genCode("c_");
      await db.clinic.update({ where: { id: clinic.id }, data: { tgLinkCode: code } });
    }
    return NextResponse.json({
      configured, botUsername, code,
      linked: Boolean(clinic.telegramChatId),
      deepLink: botUsername ? `https://t.me/${botUsername}?start=${code}` : null,
    });
  }

  let code = user.tgLinkCode;
  if (!code) {
    code = genCode("u_");
    await db.user.update({ where: { id: user.id }, data: { tgLinkCode: code } });
  }
  return NextResponse.json({
    configured, botUsername, code,
    linked: Boolean(user.telegramChatId),
    deepLink: botUsername ? `https://t.me/${botUsername}?start=${code}` : null,
  });
}

/** Ulanishni uzish */
export async function DELETE() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const lim = limitWrite(`tglink:${user.id}`, 10, 60 * 60 * 1000);
  if (lim) return lim;
  if (user.role === "CLINIC" && user.clinicId) {
    await db.clinic.update({ where: { id: user.clinicId }, data: { telegramChatId: null } });
  } else {
    await db.user.update({ where: { id: user.id }, data: { telegramChatId: null } });
  }
  audit({ actorId: user.id, actorRole: user.role, actorName: user.name ?? user.phone, action: "TG_UNLINK" });
  return NextResponse.json({ ok: true });
}
