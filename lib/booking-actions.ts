import { db } from "./db";
import { tgSend, fmtDateTimeUz } from "./telegram";
import { audit } from "./audit";
import { pushToUser } from "./push";

const ACTION_TO_AUDIT: Record<string, string> = {
  confirm: "APT_CONFIRM", reject: "APT_REJECT", alt: "APT_ALT",
  arrived: "APT_ARRIVED", no_show: "APT_NO_SHOW", done: "APT_DONE",
};

/**
 * Klinika tomonidan yozuv holatini o'zgartirish — API route ham,
 * Telegram bot ham shu bitta funksiyani chaqiradi (mantiq ikkilanmasligi uchun).
 */

const TRANSITIONS: Record<string, { from: string[]; to: string }> = {
  confirm: { from: ["PENDING", "ALT_OFFERED"], to: "CONFIRMED" },
  reject: { from: ["PENDING", "ALT_OFFERED"], to: "REJECTED" },
  arrived: { from: ["CONFIRMED", "PENDING"], to: "ARRIVED" },
  no_show: { from: ["CONFIRMED"], to: "NO_SHOW" },
  done: { from: ["ARRIVED", "CONFIRMED"], to: "DONE" },
};

export async function clinicAction(
  appointmentId: string,
  clinicId: string,
  action: string,
  extra?: { altAt?: Date; reason?: string },
  actor?: { id?: string; role: string; name: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apt = await db.appointment.findFirst({
    where: { id: appointmentId, clinicId },
    include: { clinic: true, user: true },
  });
  if (!apt) return { ok: false, error: "Yozuv topilmadi" };

  if (action === "alt") {
    if (apt.status !== "PENDING") return { ok: false, error: "Bu holatda muqobil vaqt taklif qilinmaydi" };
    if (!extra?.altAt || isNaN(extra.altAt.getTime()) || extra.altAt.getTime() < Date.now()) {
      return { ok: false, error: "Muqobil vaqt noto'g'ri" };
    }
    await db.appointment.update({
      where: { id: appointmentId },
      data: { status: "ALT_OFFERED", altAt: extra.altAt, respondedAt: apt.respondedAt ?? new Date() },
    });
    audit({ actorId: actor?.id, actorRole: actor?.role ?? "CLINIC", actorName: actor?.name ?? apt.clinic.name, action: "APT_ALT", entity: "Appointment", entityId: appointmentId });
    void db.notification.create({
      data: {
        userId: apt.userId, type: "APT_ALT",
        title: `${apt.clinic.name} boshqa vaqt taklif qildi`,
        body: `Taklif: ${fmtDateTimeUz(extra.altAt)}. Profil bo'limida qabul qilishingiz yoki bekor qilishingiz mumkin.`,
        link: "/profil",
      },
    }).catch(() => {});
    void notifyPatient(apt.user.telegramChatId, apt.clinic.name,
      `📅 <b>${apt.clinic.name}</b> boshqa vaqt taklif qildi: <b>${fmtDateTimeUz(extra.altAt)}</b>\n\nIlovadagi Profil bo'limida qabul qilishingiz yoki bekor qilishingiz mumkin.`);
    void pushToUser(apt.userId, {
      title: `${apt.clinic.name} boshqa vaqt taklif qildi`,
      body: `Taklif: ${fmtDateTimeUz(extra.altAt)}`,
      link: "appointments",
    });
    return { ok: true };
  }

  const tr = TRANSITIONS[action];
  if (!tr) return { ok: false, error: "Noma'lum amal" };
  if (!tr.from.includes(apt.status)) {
    return { ok: false, error: `"${apt.status}" holatidan bu amal bajarilmaydi` };
  }

  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      status: tr.to,
      respondedAt: apt.respondedAt ?? (["confirm", "reject"].includes(action) ? new Date() : null),
      rejectReason: action === "reject" ? (extra?.reason ?? "").slice(0, 300) : apt.rejectReason,
      arrivedAt: action === "arrived" ? new Date() : apt.arrivedAt,
    },
  });

  audit({
    actorId: actor?.id, actorRole: actor?.role ?? "CLINIC", actorName: actor?.name ?? apt.clinic.name,
    action: ACTION_TO_AUDIT[action] ?? action, entity: "Appointment", entityId: appointmentId,
    meta: { patient: apt.user.phone, clinic: apt.clinic.name },
  });

  // Bemor keldi/yakunlandi — botda baholash so'rovi (bir marta)
  if (action === "arrived" || action === "done") {
    void askReview(appointmentId).catch(() => {});
  }

  // Bemorga xabar: Telegram (ulangan bo'lsa) + bildirishnoma markazi
  if (action === "confirm") {
    void notifyPatient(apt.user.telegramChatId, apt.clinic.name,
      `✅ <b>${apt.clinic.name}</b> yozuvingizni tasdiqladi!\n\n🕐 ${fmtDateTimeUz(apt.requestedAt)}\n📍 ${apt.clinic.address}\n🔑 Yozuv kodi: <code>${apt.code}</code>`);
    void db.notification.create({
      data: {
        userId: apt.userId, type: "APT_CONFIRMED",
        title: `${apt.clinic.name} yozuvingizni tasdiqladi ✅`,
        body: `${fmtDateTimeUz(apt.requestedAt)} · ${apt.clinic.address} · kod: ${apt.code}`,
        link: "/profil",
      },
    }).catch(() => {});
    void pushToUser(apt.userId, {
      title: `${apt.clinic.name} yozuvingizni tasdiqladi ✅`,
      body: `${fmtDateTimeUz(apt.requestedAt)} · kod: ${apt.code}`,
      link: "appointments",
    });
  } else if (action === "reject") {
    void notifyPatient(apt.user.telegramChatId, apt.clinic.name,
      `❌ <b>${apt.clinic.name}</b> so'rovingizni rad etdi.${extra?.reason ? `\nSabab: ${extra.reason}` : ""}\n\nIlovada boshqa klinika tanlashingiz mumkin.`);
    void db.notification.create({
      data: {
        userId: apt.userId, type: "APT_REJECTED",
        title: `${apt.clinic.name} so'rovni rad etdi`,
        body: extra?.reason ? `Sabab: ${extra.reason}` : "Boshqa klinika tanlashingiz mumkin.",
        link: "/",
      },
    }).catch(() => {});
    void pushToUser(apt.userId, {
      title: `${apt.clinic.name} so'rovni rad etdi`,
      body: extra?.reason ? `Sabab: ${extra.reason}` : "Boshqa klinika tanlashingiz mumkin.",
      link: "appointments",
    });
  }

  return { ok: true };
}

async function notifyPatient(chatId: string | null, _clinicName: string, text: string) {
  if (chatId) await tgSend(chatId, text);
}

/**
 * Tashrif tasdiqlangach bemorga botda "Baholang" so'rovi (bir marta).
 * Baholash tugmalari bosilishini scripts/bot.ts qabul qiladi (rev:<aptId>:<baho>).
 */
export async function askReview(appointmentId: string) {
  const apt = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: { user: true, clinic: true, review: true },
  });
  if (!apt || apt.reviewAsked || apt.review || !apt.user.telegramChatId) return;
  const sent = await tgSend(
    apt.user.telegramChatId,
    `⭐ <b>${apt.clinic.name}</b> ga tashrifingiz qanday o'tdi?\n\nBaholang — fikringiz boshqa bemorlarga yordam beradi:`,
    [[1, 2, 3, 4, 5].map((n) => ({ text: "⭐".repeat(n), data: `rev:${apt.id}:${n}` }))]
  );
  if (sent) {
    await db.appointment.update({ where: { id: appointmentId }, data: { reviewAsked: true } });
  }
}

/** Yangi yozuv yaratilganda klinika chatiga xabar + tugmalar */
export async function notifyClinicNewBooking(appointmentId: string) {
  const apt = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: { clinic: true, user: true, doctor: true },
  });
  if (!apt?.clinic.telegramChatId) return;
  await tgSend(
    apt.clinic.telegramChatId,
    `🆕 <b>Yangi yozuv so'rovi</b>\n\n👤 ${apt.user.name ?? "Bemor"} — ${apt.user.phone}\n🕐 ${fmtDateTimeUz(apt.requestedAt)}${apt.doctor ? `\n👨‍⚕️ ${apt.doctor.name}` : ""}${apt.note ? `\n💬 ${apt.note}` : ""}\n\n⏱ 15 daqiqa ichida javob bering`,
    [[
      { text: "✅ Tasdiqlash", data: `apt:confirm:${apt.id}` },
      { text: "❌ Rad etish", data: `apt:reject:${apt.id}` },
    ]]
  );
}
