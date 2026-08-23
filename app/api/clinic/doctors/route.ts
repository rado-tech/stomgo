import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET() {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const doctors = await db.doctor.findMany({
    where: { clinicId: user.clinicId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ doctors });
}

export async function POST(req: NextRequest) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const name = String(body.name ?? "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "Ism kiritilmagan" }, { status: 400 });

  const doctor = await db.doctor.create({
    data: {
      clinicId: user.clinicId,
      name,
      gender: body.gender === "FEMALE" ? "FEMALE" : "MALE",
      specialty: (String(body.specialty ?? "").trim() || "TERAPEVT").slice(0, 30),
      experienceYears: Math.max(0, parseInt(String(body.experienceYears), 10) || 0),
      education: String(body.education ?? "").slice(0, 200),
      licenseNo: String(body.licenseNo ?? "").slice(0, 50),
      verification: "CLINIC_CONFIRMED", // klinika o'zi qo'shsa — tasdiqlagan hisoblanadi
      isPublic: body.isPublic !== false,
    },
  });
  audit({ actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika", action: "DOCTOR_CREATE", entity: "Doctor", entityId: doctor.id, meta: { name: doctor.name } });
  return NextResponse.json({ ok: true, doctor });
}
