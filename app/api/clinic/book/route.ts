import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";
import { normalizePhone } from "@/lib/phone";
import { pushToUser } from "@/lib/push";
import { tgSend } from "@/lib/telegram";
import { fmtDateTimeUz } from "@/lib/date-uz";

/**
 * Klinika xodimi mijozni qabulga yozib qo'yadi.
 * Odatiy holat: bemor suhbatda gaplashib "yozib qo'ying" deydi.
 *
 * Yozuv darhol CONFIRMED bo'ladi (klinikaning o'zi yaratyapti) va bemorga
 * bildirishnoma ketadi. Raqam bo'yicha foydalanuvchi topilmasa yaratiladi —
 * shunda u ilovaga kirganda yozuvini ko'radi.
 */
export async function POST(req: NextRequest) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();

  if (!rateLimit(`clinicbook:${user.id}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Juda ko'p yozuv. Birozdan keyin urining." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  const name = String(body.name ?? "").trim().slice(0, 80);
  const date = String(body.date ?? "");
  const time = String(body.time ?? "");
  const note = String(body.note ?? "").trim().slice(0, 300);
  const doctorId = String(body.doctorId ?? "") || null;
  const serviceCode = String(body.serviceCode ?? "") || null;

  if (!phone) {
    return NextResponse.json({ error: "Telefon raqam noto'g'ri (+998 XX XXX XX XX)" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "Sana yoki vaqtni tanlang" }, { status: 400 });
  }

  const requestedAt = new Date(`${date}T${time}:00+05:00`);
  if (isNaN(requestedAt.getTime())) {
    return NextResponse.json({ error: "Vaqt noto'g'ri" }, { status: 400 });
  }
  if (requestedAt.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: "O'tgan vaqtga yozib bo'lmaydi" }, { status: 400 });
  }
  if (requestedAt.getTime() > Date.now() + 90 * 86400_000) {
    return NextResponse.json({ error: "3 oydan uzoq muddatga yozib bo'lmaydi" }, { status: 400 });
  }

  const clinic = await db.clinic.findUnique({ where: { id: user.clinicId } });
  if (!clinic) return NextResponse.json({ error: "Klinika topilmadi" }, { status: 404 });

  if (doctorId) {
    const doc = await db.doctor.findFirst({ where: { id: doctorId, clinicId: user.clinicId } });
    if (!doc) return NextResponse.json({ error: "Shifokor bu klinikada emas" }, { status: 400 });
  }

  // Bemorni topamiz yoki yaratamiz
  let patient = await db.user.findUnique({ where: { phone } });
  if (patient?.blockedAt) {
    return NextResponse.json({ error: "Bu raqam bloklangan" }, { status: 403 });
  }
  if (!patient) {
    patient = await db.user.create({ data: { phone, name: name || null, role: "PATIENT" } });
  } else if (patient.role !== "PATIENT") {
    return NextResponse.json({ error: "Bu raqam xodim hisobiga tegishli" }, { status: 400 });
  } else if (name && !patient.name) {
    patient = await db.user.update({ where: { id: patient.id }, data: { name } });
  }

  // Ayni vaqtga takroriy yozuv bo'lmasin
  const clash = await db.appointment.findFirst({
    where: {
      clinicId: user.clinicId,
      userId: patient.id,
      requestedAt,
      status: { in: ["PENDING", "CONFIRMED", "ALT_OFFERED"] },
    },
  });
  if (clash) {
    return NextResponse.json({ error: "Bu bemor shu vaqtga allaqachon yozilgan" }, { status: 409 });
  }

  const code = String(1000 + Math.floor(Math.random() * 9000));
  const apt = await db.appointment.create({
    data: {
      userId: patient.id,
      clinicId: user.clinicId,
      doctorId,
      serviceCode,
      requestedAt,
      note,
      code,
      source: "CLINIC",
      status: "CONFIRMED",
      respondedAt: new Date(),
    },
  });

  // Bildirishnoma kafolatlangan bo'lishi kerak — bemor yozuvni ko'rishi shart
  await db.notification.create({
    data: {
      userId: patient.id,
      type: "APT_CONFIRMED",
      title: `${clinic.name} sizni qabulga yozdi`,
      body: `${fmtDateTimeUz(requestedAt)} · ${clinic.address}`,
      link: "/profil",
    },
  }).catch(() => {});


  void pushToUser(patient.id, {
    title: `${clinic.name} sizni qabulga yozdi`,
    body: fmtDateTimeUz(requestedAt),
    link: "appointments",
  });

  if (patient.telegramChatId) {
    void tgSend(
      patient.telegramChatId,
      `📅 <b>${clinic.name}</b> sizni qabulga yozdi\n\n🕐 ${fmtDateTimeUz(requestedAt)}\n📍 ${clinic.address}\n\n` +
      `Kelganingizda resepshndagi QR kodni skanerlang.`
    );
  }

  audit({
    actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? clinic.name,
    action: "APT_CREATE", entity: "Appointment", entityId: apt.id,
    meta: { byClinic: true, patient: phone, at: requestedAt.toISOString() },
  });

  return NextResponse.json({
    ok: true,
    appointment: { id: apt.id, requestedAt: apt.requestedAt },
    patient: { name: patient.name, phone: patient.phone },
  });
}
