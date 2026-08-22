import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

/** Qurilma tokenini ro'yxatdan o'tkazish (ilova va brauzer uchun) */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const b = await req.json().catch(() => ({}));
  const token = String(b.token ?? "").trim();
  const kind = b.kind === "WEB" ? "WEB" : "EXPO";
  const platform = String(b.platform ?? "").slice(0, 20);
  const p256dh = String(b.p256dh ?? "");
  const auth = String(b.auth ?? "");

  if (!token || token.length > 1024) {
    return NextResponse.json({ error: "Token noto'g'ri" }, { status: 400 });
  }
  if (kind === "WEB" && (!p256dh || !auth)) {
    return NextResponse.json({ error: "Web Push kalitlari yetishmayapti" }, { status: 400 });
  }

  // Ayni token boshqa foydalanuvchida bo'lsa (umumiy telefon) — egasini yangilaymiz
  await db.device.upsert({
    where: { token },
    create: { userId: user.id, token, kind, platform, p256dh, auth },
    update: { userId: user.id, kind, platform, p256dh, auth, failCount: 0, usedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

/** Chiqishda yoki ruxsat olib tashlanganda tokenni o'chirish */
export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const token = String(b.token ?? "");
  if (token) await db.device.deleteMany({ where: { token, userId: user.id } });
  return NextResponse.json({ ok: true });
}

/** Sinov uchun: o'ziga bitta push yuborish */
export async function PUT() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { pushToUser } = await import("@/lib/push");
  const count = await db.device.count({ where: { userId: user.id } });
  if (count === 0) return NextResponse.json({ error: "Qurilma ro'yxatdan o'tmagan" }, { status: 400 });
  await pushToUser(user.id, { title: "StomGo", body: "Sinov bildirishnomasi — hammasi ishlayapti ✅", link: "/" });
  return NextResponse.json({ ok: true, devices: count });
}
