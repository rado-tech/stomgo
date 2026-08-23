import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { limitWrite } from "@/lib/ratelimit";
import { requireUser, unauthorized } from "@/lib/auth";

/** Bildirishnoma markazi: ro'yxat + o'qilmaganlar soni */
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return NextResponse.json({ items, unread });
}

/** O'qilgan deb belgilash: {id} bitta, {all:true} hammasi */
export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const lim = limitWrite(`notif:${user.id}`, 120, 60 * 60 * 1000);
  if (lim) return lim;
  const body = await req.json().catch(() => ({}));
  if (body.all === true) {
    await db.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (body.id) {
    await db.notification.updateMany({
      where: { id: String(body.id), userId: user.id },
      data: { readAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
