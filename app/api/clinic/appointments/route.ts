import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";

export async function GET() {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();

  const items = await db.appointment.findMany({
    where: { clinicId: user.clinicId },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    include: {
      user: { select: { name: true, phone: true } },
      doctor: { select: { name: true } },
    },
  });

  // SLA: 15 daqiqadan oshgan javobsiz so'rovlar belgilanadi
  const now = Date.now();
  const mapped = items.map((a) => ({
    id: a.id,
    patientName: a.user.name ?? "Bemor",
    patientPhone: a.user.phone,
    doctorName: a.doctor?.name ?? null,
    serviceCode: a.serviceCode,
    requestedAt: a.requestedAt,
    altAt: a.altAt,
    status: a.status,
    note: a.note,
    code: a.code,
    createdAt: a.createdAt,
    overdue: a.status === "PENDING" && now - a.createdAt.getTime() > 15 * 60 * 1000,
  }));

  const clinic = await db.clinic.findUnique({
    where: { id: user.clinicId },
    select: { checkinCode: true, name: true },
  });

  return NextResponse.json({ items: mapped, checkinCode: clinic?.checkinCode, clinicName: clinic?.name });
}
