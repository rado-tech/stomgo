import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET() {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();
  const reviews = await db.review.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { name: true, phone: true } },
      clinic: { select: { name: true } },
    },
  });
  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id, rating: r.rating, text: r.text,
      author: r.user.name ?? r.user.phone, clinicName: r.clinic.name, date: r.createdAt,
    })),
  });
}

/** Sharhni tasdiqlash/rad etish + klinika reytingini qayta hisoblash */
export async function PATCH(req: NextRequest) {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Noma'lum amal" }, { status: 400 });
  }

  const review = await db.review.findUnique({ where: { id } });
  if (!review) return NextResponse.json({ error: "Sharh topilmadi" }, { status: 404 });

  await db.review.update({
    where: { id },
    data: { status: action === "approve" ? "APPROVED" : "REJECTED" },
  });
  audit({
    actorId: user.id, actorRole: "ADMIN", actorName: user.name ?? "Admin",
    action: action === "approve" ? "REVIEW_APPROVE" : "REVIEW_REJECT",
    entity: "Review", entityId: id,
  });

  if (action === "approve") {
    const approved = await db.review.findMany({ where: { clinicId: review.clinicId, status: "APPROVED" } });
    const avg = approved.reduce((s, r) => s + r.rating, 0) / approved.length;
    await db.clinic.update({
      where: { id: review.clinicId },
      data: { rating: Math.round(avg * 10) / 10, reviewCount: approved.length },
    });
  }

  return NextResponse.json({ ok: true });
}
