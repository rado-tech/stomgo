import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET() {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const c = await db.clinic.findUnique({ where: { id: user.clinicId } });
  if (!c) return unauthorized();
  return NextResponse.json({
    clinic: {
      name: c.name, description: c.description, address: c.address, district: c.district,
      phone: c.phone, lat: c.lat, lng: c.lng, photoUrl: c.photoUrl,
      workingHours: JSON.parse(c.workingHours),
      is247: c.is247, emergency: c.emergency, childFriendly: c.childFriendly,
      showDoctors: c.showDoctors, tier: c.tier, tierEndsAt: c.tierEndsAt,
      checkinCode: c.checkinCode,
      qrToken: c.qrToken,
      infoConfirmedAt: c.infoConfirmedAt,
      infoStale: c.infoConfirmedAt.getTime() < Date.now() - 60 * 864e5,
    },
  });
}

// Toshkent chegarasi (taxminiy)
const BOUNDS = { latMin: 40.9, latMax: 41.6, lngMin: 68.8, lngMax: 69.8 };

export async function PATCH(req: NextRequest) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 100);
  if (typeof body.description === "string") data.description = body.description.slice(0, 1000);
  if (typeof body.address === "string" && body.address.trim()) data.address = body.address.trim().slice(0, 200);
  if (typeof body.district === "string" && body.district.trim()) data.district = body.district.trim().slice(0, 50);
  if (typeof body.phone === "string") data.phone = body.phone.slice(0, 20);
  if (typeof body.is247 === "boolean") data.is247 = body.is247;
  if (typeof body.emergency === "boolean") data.emergency = body.emergency;
  if (typeof body.childFriendly === "boolean") data.childFriendly = body.childFriendly;
  if (typeof body.showDoctors === "boolean") data.showDoctors = body.showDoctors;
  if (body.workingHours && typeof body.workingHours === "object") {
    data.workingHours = JSON.stringify(body.workingHours);
  }

  // Joylashuv — klinika o'zi belgilaydi (xarita orqali)
  if (body.lat !== undefined && body.lng !== undefined) {
    const lat = parseFloat(String(body.lat));
    const lng = parseFloat(String(body.lng));
    if (isNaN(lat) || isNaN(lng) || lat < BOUNDS.latMin || lat > BOUNDS.latMax || lng < BOUNDS.lngMin || lng > BOUNDS.lngMax) {
      return NextResponse.json({ error: "Joylashuv Toshkent chegarasidan tashqarida ko'rinyapti" }, { status: 400 });
    }
    data.lat = lat;
    data.lng = lng;
  }

  if (body.confirmInfo === true) data.infoConfirmedAt = new Date();
  if (body.regenerateCheckinCode === true) {
    data.checkinCode = String(1000 + Math.floor(Math.random() * 9000));
  }

  await db.clinic.update({ where: { id: user.clinicId }, data });
  audit({
    actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika",
    action: "CLINIC_UPDATE", entity: "Clinic", entityId: user.clinicId,
    meta: { fields: Object.keys(data) },
  });
  return NextResponse.json({ ok: true });
}
