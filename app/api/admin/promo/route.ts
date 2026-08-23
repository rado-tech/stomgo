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
  // Faqat PRO tarifdagi va faol klinikalar top joylashuvga loyiq
  const clinics = await db.clinic.findMany({
    where: { deactivatedAt: null, tier: "PRO" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ slots, clinics });
}

export async function POST(req: NextRequest) {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const clinicId = String(body.clinicId ?? "");
  const days = Math.min(365, Math.max(1, parseInt(String(body.days), 10) || 30));
  // Pozitsiya endi yo'q — barcha top joylashuvlar teng, tartib reyting/masofa bo'yicha

  const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) return NextResponse.json({ error: "Klinika topilmadi" }, { status: 404 });
  if (clinic.deactivatedAt) {
    return NextResponse.json({ error: "Shartnomasi bekor qilingan klinikaga VIP berilmaydi" }, { status: 400 });
  }
  // VIP — pullik xizmat, shuning uchun faqat PRO tarifdagi klinikaga
  if (clinic.tier !== "PRO") {
    return NextResponse.json(
      { error: `${clinic.name} FREE tarifda. Avval PRO tarifga o'tkazing.` },
      { status: 400 }
    );
  }

  // Ayni klinikaga takroriy faol slot berilmasin (pozitsiyalar soni cheklanmagan)
  const active = await db.promoSlot.findFirst({
    where: { clinicId, endsAt: { gte: new Date() } },
  });
  if (active) {
    return NextResponse.json(
      { error: "Bu klinikada faol VIP slot bor. Avval uni tugating." },
      { status: 409 }
    );
  }

  const slot = await db.promoSlot.create({
    data: { clinicId, position: 1, startsAt: new Date(), endsAt: new Date(Date.now() + days * 864e5) },
  });
  audit({ actorId: user.id, actorRole: "ADMIN", actorName: user.name ?? "Admin", action: "PROMO_CREATE", entity: "Clinic", entityId: clinicId, meta: { days, clinic: clinic.name } });
  return NextResponse.json({ ok: true, slot });
}

export async function DELETE(req: NextRequest) {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const slot = await db.promoSlot.findUnique({
    where: { id },
    include: { clinic: { select: { name: true } } },
  });
  if (!slot) return NextResponse.json({ error: "Top joylashuv topilmadi" }, { status: 404 });

  // Tugatish emas, BUTUNLAY o'chirish — ro'yxatda eskirgan yozuvlar yig'ilmasin.
  // Iz jurnalda qoladi: kim, qachon, qaysi klinika, necha kunga berilgan edi.
  await db.promoSlot.delete({ where: { id } });

  audit({
    actorId: user.id, actorRole: "ADMIN", actorName: user.name ?? "Admin",
    action: "PROMO_END", entity: "PromoSlot", entityId: id,
    meta: {
      clinic: slot.clinic.name,
      boshlangan: slot.startsAt.toISOString(),
      tugashi: slot.endsAt.toISOString(),
    },
  });
  return NextResponse.json({ ok: true });
}
