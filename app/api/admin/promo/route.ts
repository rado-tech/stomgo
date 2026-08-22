import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET() {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();
  const slots = await db.promoSlot.findMany({
    orderBy: { endsAt: "desc" },
    include: { clinic: { select: { name: true, slug: true } } },
  });
  const clinics = await db.clinic.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ slots, clinics });
}

export async function POST(req: NextRequest) {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const clinicId = String(body.clinicId ?? "");
  const days = Math.min(365, Math.max(1, parseInt(String(body.days), 10) || 30));
  const position = body.position === 2 ? 2 : 1;

  const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) return NextResponse.json({ error: "Klinika topilmadi" }, { status: 404 });

  // Bir vaqtda bitta pozitsiyada faqat bitta faol slot
  const active = await db.promoSlot.findFirst({
    where: { position, endsAt: { gte: new Date() } },
  });
  if (active) {
    return NextResponse.json({ error: `${position}-pozitsiyada faol slot bor. Avval uni tugating.` }, { status: 409 });
  }

  const slot = await db.promoSlot.create({
    data: { clinicId, position, startsAt: new Date(), endsAt: new Date(Date.now() + days * 864e5) },
  });
  audit({ actorId: user.id, actorRole: "ADMIN", actorName: user.name ?? "Admin", action: "PROMO_CREATE", entity: "Clinic", entityId: clinicId, meta: { position, days } });
  return NextResponse.json({ ok: true, slot });
}

export async function DELETE(req: NextRequest) {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const slot = await db.promoSlot.findUnique({ where: { id } });
  if (!slot) return NextResponse.json({ error: "Slot topilmadi" }, { status: 404 });
  await db.promoSlot.update({ where: { id }, data: { endsAt: new Date() } });
  audit({ actorId: user.id, actorRole: "ADMIN", actorName: user.name ?? "Admin", action: "PROMO_END", entity: "PromoSlot", entityId: id });
  return NextResponse.json({ ok: true });
}
