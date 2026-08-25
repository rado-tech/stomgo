import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "./db";
import { authSecret } from "./config";

/**
 * Sessiya imzo kaliti — DANGASA (birinchi ishlatishda o'qiladi).
 *
 * Modul yuklanishida o'qilsa, `next build` ham kalitni talab qilardi —
 * holbuki yig'ilish mashinasida ishlab chiqarish siri bo'lmasligi kerak.
 * Kalit faqat haqiqiy so'rov kelganda tekshiriladi.
 */
let cachedSecret: Uint8Array | null = null;
function secret(): Uint8Array {
  if (!cachedSecret) cachedSecret = new TextEncoder().encode(authSecret());
  return cachedSecret;
}
const COOKIE = "sg_session";

export type Session = {
  uid: string;
  role: "PATIENT" | "CLINIC" | "ADMIN";
  clinicId?: string;
  /** JWT berilgan vaqt (soniyada) — sessiyani bekor qilish uchun */
  iat?: number;
  /**
   * Admin boshqa hisob nomidan ishlayotgan bo'lsa — o'sha adminning id'si.
   * Jurnalga yoziladi: "klinika qildi" emas, "admin klinika nomidan qildi".
   */
  impBy?: string;
};

export async function createSession(s: Session, expiresIn = "30d"): Promise<string> {
  return await new SignJWT(s as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

/**
 * Joriy sessiya boshqa hisob nomidan ochilganmi.
 * audit() shu orqali kim aslida ish qilganini yozadi.
 */
export async function impersonatedBy(): Promise<string | null> {
  const s = await getSession();
  return s?.impBy ?? null;
}

export async function getSession(): Promise<Session | null> {
  // 1) Cookie (web) 2) Authorization: Bearer (mobil ilova)
  const store = await cookies();
  let token = store.get(COOKIE)?.value;
  if (!token) {
    const { headers } = await import("next/headers");
    const h = await headers();
    const authHeader = h.get("authorization");
    if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
  }
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 3600,
    path: "/",
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
}

export async function requireUser() {
  const s = await getSession();
  if (!s) return null;
  const user = await db.user.findUnique({ where: { id: s.uid } });
  if (!user) return null;

  // Admin bloklagan yoki hisob o'chirilgan — amaldagi tokeni bo'lsa ham kira olmaydi
  if (user.blockedAt || user.deletedAt) return null;

  // Parol o'zgargan bo'lsa, undan OLDIN berilgan tokenlar bekor.
  // Bunisiz: hisob o'g'irlangach parol almashtirilsa ham, buzg'unchining
  // sessiyasi yana 30 kun ishlab turardi.
  if (user.sessionsFrom && typeof s.iat === "number") {
    if (s.iat * 1000 < user.sessionsFrom.getTime()) return null;
  }

  return user;
}

/**
 * Shu foydalanuvchining BARCHA ochiq sessiyalarini bekor qiladi.
 * Parol almashtirilganda va parol tiklanganda chaqiriladi.
 */
export async function revokeSessions(userId: string) {
  // Bir soniya oldinga suramiz: shu soniyada berilgan token ham bekor bo'lsin
  // (JWT `iat` soniya aniqligida saqlanadi)
  await db.user.update({
    where: { id: userId },
    data: { sessionsFrom: new Date(Date.now() + 1000) },
  });
}

export async function requireRole(role: "PATIENT" | "CLINIC" | "ADMIN") {
  const user = await requireUser();
  if (!user || user.role !== role) return null;
  return user;
}

export function unauthorized() {
  return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
}
