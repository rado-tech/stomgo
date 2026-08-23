import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-stomgo-o-zgartiring-productionda"
);
const COOKIE = "sg_session";

export type Session = {
  uid: string;
  role: "PATIENT" | "CLINIC" | "ADMIN";
  clinicId?: string;
};

export async function createSession(s: Session): Promise<string> {
  return await new SignJWT(s as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
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
    const { payload } = await jwtVerify(token, SECRET);
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
  // Admin bloklagan bo'lsa — amaldagi tokeni bo'lsa ham kira olmaydi
  if (user.blockedAt || user.deletedAt) return null;
  return user;
}

export async function requireRole(role: "PATIENT" | "CLINIC" | "ADMIN") {
  const user = await requireUser();
  if (!user || user.role !== role) return null;
  return user;
}

export function unauthorized() {
  return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
}
