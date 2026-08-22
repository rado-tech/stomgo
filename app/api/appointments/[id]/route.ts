import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { pushToClinic } from "@/lib/push";
import { tgSend } from "@/lib/telegram";
import { fmtDateTimeUz } from "@/lib/date-uz";

/** Bemor tomonidan: bekor qilish, muqobil vaqtni qabul qilish, o'zi kelganini belgilash (check-in) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  const apt = await db.appointment.findFirst({ where: { id, userId: user.id }, include: { clinic: true } });
  if (!apt) return NextResponse.json({ error: "Yozuv topilmadi" }, { status: 404 });

  if (action === "cancel") {
    if (!["PENDING", "CONFIRMED", "ALT_OFFERED"].includes(apt.status)) {
      return NextResponse.json({ error: "Bu yozuvni bekor qilib bo'lmaydi" }, { status: 400 });
    }
    await db.appointment.update({ where: { id }, data: { status: "CANCELLED" } });
    audit({ actorId: user.id, actorRole: "PATIENT", actorName: user.name ?? user.phone, action: "APT_CANCEL", entity: "Appointment", entityId: id });
    return NextResponse.json({ ok: true });
  }

  if (action === "accept_alt") {
    if (apt.status !== "ALT_OFFERED" || !apt.altAt) {
      return NextResponse.json({ error: "Muqobil vaqt taklifi yo'q" }, { status: 400 });
    }
    await db.appointment.update({
      where: { id },
      data: { status: "CONFIRMED", requestedAt: apt.altAt, altAt: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reschedule") {
    // Bemor o'zi boshqa vaqt so'raydi — yozuv qaytadan PENDING bo'ladi
    if (!["PENDING", "CONFIRMED", "ALT_OFFERED"].includes(apt.status)) {
      return NextResponse.json({ error: "Bu yozuv vaqtini o'zgartirib bo'lmaydi" }, { status: 400 });
    }
    if (apt.rescheduleCount >= 3) {
      return NextResponse.json({ error: "Vaqtni ko'pi bilan 3 marta ko'chirish mumkin. Bekor qilib, yangi yozuv oching." }, { status: 400 });
    }
    // Yozilishdagi kabi Toshkent vaqti (+05:00) bo'yicha
    const date = String(body.date ?? "");
    const time = String(body.time ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: "Sana yoki vaqt noto'g'ri" }, { status: 400 });
    }
    const newAt = new Date(`${date}T${time}:00+05:00`);
    if (isNaN(newAt.getTime())) {
      return NextResponse.json({ error: "Vaqt noto'g'ri" }, { status: 400 });
    }
    if (newAt.getTime() < Date.now() + 30 * 60 * 1000) {
      return NextResponse.json({ error: "Kamida 30 daqiqa keyingi vaqtni tanlang" }, { status: 400 });
    }
    if (newAt.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "3 oydan uzoq muddatga yozib bo'lmaydi" }, { status: 400 });
    }

    await db.appointment.update({
      where: { id },
      data: {
        requestedAt: newAt,
        status: "PENDING",
        altAt: null,
        respondedAt: null,
        rescheduleCount: { increment: 1 },
      },
    });
    audit({ actorId: user.id, actorRole: "PATIENT", actorName: user.name ?? user.phone, action: "APT_RESCHEDULE", entity: "Appointment", entityId: id, meta: { at: newAt.toISOString() } });

    const who = user.name ?? user.phone;
    void pushToClinic(apt.clinicId, {
      title: "Vaqt o'zgartirildi",
      body: `${who}: yangi vaqt ${fmtDateTimeUz(newAt)} — tasdiqlashingiz kerak`,
      link: "appointments",
    });
    if (apt.clinic.telegramChatId) {
      void tgSend(apt.clinic.telegramChatId,
        `🔄 <b>Bemor vaqtni o'zgartirdi</b>
${who}
Yangi vaqt: <b>${fmtDateTimeUz(newAt)}</b>

Panelda tasdiqlang.`);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "checkin") {
    // Resepshn stolidagi kod orqali bemorning o'zi kelganini tasdiqlaydi
    if (apt.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Faqat tasdiqlangan yozuvda check-in qilinadi" }, { status: 400 });
    }
    if (String(body.clinicCode ?? "") !== apt.clinic.checkinCode) {
      return NextResponse.json({ error: "Kod noto'g'ri. Resepshndagi kodni kiriting." }, { status: 400 });
    }
    await db.appointment.update({ where: { id }, data: { status: "ARRIVED", arrivedAt: new Date() } });
    audit({ actorId: user.id, actorRole: "PATIENT", actorName: user.name ?? user.phone, action: "APT_CHECKIN", entity: "Appointment", entityId: id });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Noma'lum amal" }, { status: 400 });
}
