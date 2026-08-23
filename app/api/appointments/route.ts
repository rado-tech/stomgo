import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { notifyClinicNewBooking } from "@/lib/booking-actions";
import { audit } from "@/lib/audit";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const items = await db.appointment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      clinic: { select: { name: true, slug: true, address: true, phone: true, coverHue: true, deactivatedAt: true } },
      doctor: { select: { name: true, specialty: true } },
      review: { select: { id: true } },
    },
  });

  // clinicActive: klinika hali platformada bormi (shartnoma bekor qilinmaganmi)
  return NextResponse.json({
    items: items.map(({ clinic, ...rest }) => ({
      ...rest,
      clinic: {
        name: clinic.name, slug: clinic.slug, address: clinic.address,
        phone: clinic.phone, coverHue: clinic.coverHue,
        active: clinic.deactivatedAt === null,
      },
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const clinicId = String(body.clinicId ?? "");
  const doctorId = body.doctorId ? String(body.doctorId) : null;
  const serviceCode = body.serviceCode ? String(body.serviceCode) : null;
  const date = String(body.date ?? ""); // YYYY-MM-DD
  const time = String(body.time ?? ""); // HH:MM
  const note = String(body.note ?? "").slice(0, 500);
  const source = body.source === "TRIAGE" ? "TRIAGE" : "APP";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "Sana yoki vaqt noto'g'ri" }, { status: 400 });
  }
  const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) return NextResponse.json({ error: "Klinika topilmadi" }, { status: 404 });
  if (doctorId) {
    const doc = await db.doctor.findFirst({ where: { id: doctorId, clinicId } });
    if (!doc) return NextResponse.json({ error: "Shifokor topilmadi" }, { status: 404 });
  }

  // Toshkent vaqti (UTC+5) bo'yicha so'ralgan vaqt
  const requestedAt = new Date(`${date}T${time}:00+05:00`);
  if (isNaN(requestedAt.getTime()) || requestedAt.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: "O'tgan vaqtga yozilib bo'lmaydi" }, { status: 400 });
  }

  // Bitta klinikaga bitta faol so'rov
  const existing = await db.appointment.findFirst({
    where: { userId: user.id, clinicId, status: { in: ["PENDING", "CONFIRMED", "ALT_OFFERED"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "Bu klinikada faol yozuvingiz bor. Avval uni bekor qiling." }, { status: 409 });
  }

  const apt = await db.appointment.create({
    data: {
      userId: user.id, clinicId, doctorId, serviceCode, requestedAt, note, source,
      code: String(100000 + Math.floor(Math.random() * 900000)),
    },
  });
  await db.event.create({ data: { clinicId, userId: user.id, type: "BOOKING_CREATED" } });
  audit({
    actorId: user.id, actorRole: "PATIENT", actorName: user.name ?? user.phone,
    action: "APT_CREATE", entity: "Appointment", entityId: apt.id, meta: { clinic: clinic.name },
  });

  // Klinika Telegram chatiga xabar (ulangan bo'lsa) — javobni kutmaymiz
  void notifyClinicNewBooking(apt.id).catch(() => {});

  return NextResponse.json({ ok: true, id: apt.id, code: apt.code });
}
