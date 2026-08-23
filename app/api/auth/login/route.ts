import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, setSessionCookie, type Session } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

/** Xodimlar (klinika/admin) uchun login + parol bilan kirish */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ error: "Login va parolni kiriting" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`login:${username}`, 10, 15 * 60 * 1000) || !rateLimit(`login:ip:${ip}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Juda ko'p urinish. Keyinroq qayta urining." }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { username } });
  if (user?.blockedAt) {
    return NextResponse.json({ error: "Hisobingiz bloklangan. Qo'llab-quvvatlash bilan bog'laning." }, { status: 403 });
  }
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    audit({ action: "LOGIN_FAIL", actorRole: "SYSTEM", meta: { username, ip } });
    return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
  }

  const session: Session = {
    uid: user.id,
    role: user.role as Session["role"],
    clinicId: user.clinicId ?? undefined,
  };
  const token = await createSession(session);
  const redirect = user.role === "ADMIN" ? "/admin" : user.role === "CLINIC" ? "/clinic" : "/";

  audit({ actorId: user.id, actorRole: user.role, actorName: user.name ?? username, action: "LOGIN_PASSWORD" });

  const res = NextResponse.json({
    ok: true,
    redirect,
    token, // mobil ilova uchun (Authorization: Bearer)
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
  });
  setSessionCookie(res, token);
  return res;
}
