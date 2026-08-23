import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { createSession, setSessionCookie, type Session } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  const code = String(body.code ?? "").trim();
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";

  if (!phone || code.length !== 6) {
    return NextResponse.json({ error: "Raqam yoki kod noto'g'ri" }, { status: 400 });
  }

  // Oxirgi amal qilayotgan kodni olamiz va urinishlarni sanaymiz (brute-force himoyasi)
  const otp = await db.otpCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= 5) {
    return NextResponse.json({ error: "Kod topilmadi yoki urinishlar tugadi. Yangi kod oling." }, { status: 400 });
  }
  if (otp.code !== code) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "Kod noto'g'ri" }, { status: 400 });
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  let user = await db.user.findUnique({ where: { phone } });
  if (user?.blockedAt) {
    return NextResponse.json({ error: "Hisobingiz bloklangan. Qo'llab-quvvatlash bilan bog'laning." }, { status: 403 });
  }
  if (!user) {
    user = await db.user.create({ data: { phone, name: name || null, role: "PATIENT" } });
  } else if (name && !user.name) {
    user = await db.user.update({ where: { id: user.id }, data: { name } });
  }

  const session: Session = {
    uid: user.id,
    role: user.role as Session["role"],
    clinicId: user.clinicId ?? undefined,
  };
  const token = await createSession(session);
  const redirect = user.role === "ADMIN" ? "/admin" : user.role === "CLINIC" ? "/clinic" : "/";
  audit({ actorId: user.id, actorRole: user.role, actorName: user.name ?? user.phone, action: "LOGIN_OTP" });
  const res = NextResponse.json({
    ok: true,
    redirect,
    token, // mobil ilova uchun (Authorization: Bearer)
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
  });
  setSessionCookie(res, token);
  return res;
}
