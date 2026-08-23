import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { limitWrite } from "@/lib/ratelimit";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET() {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const reviews = await db.review.findMany({
    where: { clinicId: user.clinicId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });
  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id, rating: r.rating, text: r.text, reply: r.reply,
      author: r.user.name?.trim() || "Bemor",
      date: r.createdAt,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const lim = limitWrite(`crev:${user.id}`, 60, 60 * 60 * 1000);
  if (lim) return lim;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const reply = String(body.reply ?? "").slice(0, 500);

  const review = await db.review.findFirst({ where: { id, clinicId: user.clinicId } });
  if (!review) return NextResponse.json({ error: "Sharh topilmadi" }, { status: 404 });

  await db.review.update({ where: { id }, data: { reply } });
  audit({ actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika", action: "REVIEW_REPLY", entity: "Review", entityId: id });
  return NextResponse.json({ ok: true });
}
