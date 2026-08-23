import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";

/**
 * Shifokor hujjatlarini tekshirish — faqat admin.
 * Ta'lim va diplom raqami BEMORGA KO'RINMAYDI: ular shu yerda,
 * tekshiruv uchun ishlatiladi. Bemor faqat natijani ("Hujjatlari
 * tekshirilgan" nishoni) ko'radi.
 */
export async function GET(req: NextRequest) {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();

  const filter = req.nextUrl.searchParams.get("filter") ?? "all";
  const where =
    filter === "pending" ? { verification: { not: "DOC_VERIFIED" } } :
    filter === "verified" ? { verification: "DOC_VERIFIED" } : {};

  const doctors = await db.doctor.findMany({
    where,
    orderBy: [{ verification: "asc" }, { createdAt: "desc" }],
    take: 300,
    include: { clinic: { select: { name: true, slug: true } } },
  });

  return NextResponse.json({
    items: doctors.map((d) => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      gender: d.gender,
      experienceYears: d.experienceYears,
      education: d.education,
      licenseNo: d.licenseNo,
      verification: d.verification,
      isPublic: d.isPublic,
      photoUrl: d.photoUrl,
      clinic: d.clinic.name,
      clinicSlug: d.clinic.slug,
      createdAt: d.createdAt,
    })),
  });
}

/** Hujjat tekshiruvi natijasini qo'yish */
export async function PATCH(req: NextRequest) {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const verification = String(body.verification ?? "");

  if (!["REGISTERED", "CLINIC_CONFIRMED", "DOC_VERIFIED"].includes(verification)) {
    return NextResponse.json({ error: "Noma'lum status" }, { status: 400 });
  }

  const doctor = await db.doctor.findUnique({ where: { id }, include: { clinic: { select: { name: true } } } });
  if (!doctor) return NextResponse.json({ error: "Shifokor topilmadi" }, { status: 404 });

  if (verification === "DOC_VERIFIED" && !doctor.licenseNo.trim()) {
    return NextResponse.json(
      { error: "Diplom/litsenziya raqami kiritilmagan — tekshirilgan deb belgilab bo'lmaydi" },
      { status: 400 }
    );
  }

  await db.doctor.update({ where: { id }, data: { verification } });
  audit({
    actorId: user.id, actorRole: "ADMIN", actorName: user.name ?? "Admin",
    action: "DOCTOR_VERIFY", entity: "Doctor", entityId: id,
    meta: { doctor: doctor.name, clinic: doctor.clinic.name, verification },
  });

  return NextResponse.json({ ok: true });
}
