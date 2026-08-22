import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const doc = await db.doctor.findFirst({ where: { id, clinicId: user.clinicId } });
  if (!doc) return NextResponse.json({ error: "Shifokor topilmadi" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 80);
  if (body.gender === "MALE" || body.gender === "FEMALE") data.gender = body.gender;
  if (typeof body.specialty === "string") data.specialty = body.specialty.slice(0, 30);
  if (body.experienceYears !== undefined) data.experienceYears = Math.max(0, parseInt(String(body.experienceYears), 10) || 0);
  if (typeof body.education === "string") data.education = body.education.slice(0, 200);
  if (typeof body.licenseNo === "string") data.licenseNo = body.licenseNo.slice(0, 50);
  if (typeof body.isPublic === "boolean") data.isPublic = body.isPublic;

  await db.doctor.update({ where: { id }, data });
  audit({ actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika", action: "DOCTOR_UPDATE", entity: "Doctor", entityId: id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const { id } = await params;
  const doc = await db.doctor.findFirst({ where: { id, clinicId: user.clinicId } });
  if (!doc) return NextResponse.json({ error: "Shifokor topilmadi" }, { status: 404 });

  const hasAppointments = await db.appointment.count({ where: { doctorId: id } });
  if (hasAppointments > 0) {
    // Yozuvlar tarixini saqlash uchun o'chirmasdan yashiramiz
    await db.doctor.update({ where: { id }, data: { isPublic: false } });
  } else {
    await db.doctor.delete({ where: { id } });
  }
  audit({ actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika", action: "DOCTOR_DELETE", entity: "Doctor", entityId: id, meta: { name: doc.name } });
  return NextResponse.json({ ok: true });
}
