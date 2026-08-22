import { db } from "./db";
import { tgSend } from "./telegram";
import { pushToUser, pushToClinic, pushToAdmins } from "./push";

/**
 * Suhbat yordamchilari.
 * Muhim qoida: barcha muloqot ilova ichida — tashqi kanallar (Telegram/telefon)
 * orqali kelishuvlarga platforma javobgar emas.
 */

export type Actor =
  | { kind: "PATIENT"; userId: string; name: string }
  | { kind: "CLINIC"; userId: string; clinicId: string; name: string }
  | { kind: "ADMIN"; userId: string; name: string };

/** Bemor uchun suhbat ochish yoki mavjudini olish */
export async function getOrCreateConversation(
  userId: string,
  opts: { clinicId?: string | null; type?: "CLINIC" | "SUPPORT" }
) {
  const type = opts.type ?? (opts.clinicId ? "CLINIC" : "SUPPORT");
  const clinicId = type === "SUPPORT" ? null : opts.clinicId ?? null;

  const existing = await db.conversation.findFirst({ where: { userId, clinicId, type } });
  if (existing) return existing;

  return db.conversation.create({ data: { userId, clinicId, type } });
}

/** Xabar yuborish + qarshi tomonni xabardor qilish */
export async function sendMessage(params: {
  conversationId: string;
  senderRole: "PATIENT" | "CLINIC" | "SUPPORT" | "SYSTEM";
  senderName: string;
  body: string;
  imageUrl?: string | null;
}) {
  const body = params.body.trim().slice(0, 2000);
  const imageUrl = params.imageUrl ?? null;
  // Rasm bo'lsa matn shart emas
  if (!body && !imageUrl) return null;

  const conv = await db.conversation.findUnique({
    where: { id: params.conversationId },
    include: { user: true, clinic: true },
  });
  if (!conv) return null;

  const msg = await db.message.create({
    data: {
      conversationId: conv.id,
      senderRole: params.senderRole,
      senderName: params.senderName,
      body,
      imageUrl,
    },
  });

  // Yuboruvchi tomonni "o'qigan" deb belgilaymiz, suhbatni yuqoriga ko'taramiz
  await db.conversation.update({
    where: { id: conv.id },
    data: {
      lastMessageAt: msg.createdAt,
      ...(params.senderRole === "PATIENT" ? { userReadAt: msg.createdAt } : { staffReadAt: msg.createdAt }),
    },
  });

  const preview = imageUrl && !body ? "📷 Rasm" : body.length > 90 ? `${body.slice(0, 90)}…` : body;

  if (params.senderRole === "PATIENT") {
    const who = conv.user.name ?? "Bemor";
    if (conv.type === "SUPPORT") {
      void pushToAdmins({ title: `Murojaat: ${who}`, body: preview, link: `chat:${conv.id}` });
    } else if (conv.clinicId) {
      void pushToClinic(conv.clinicId, { title: `Yangi xabar: ${who}`, body: preview, link: `chat:${conv.id}` });
    }
    // Klinikaga xabar (Telegram ulangan bo'lsa)
    if (conv.clinic?.telegramChatId) {
      void tgSend(
        conv.clinic.telegramChatId,
        `💬 <b>Yangi xabar</b>\n${conv.user.name ?? "Bemor"}: ${preview}\n\nPanelda javob bering: Xabarlar bo'limi`
      );
    }
  } else {
    // Bemorga bildirishnoma + Telegram
    const title = params.senderRole === "SUPPORT"
      ? "Qo'llab-quvvatlash javob berdi"
      : `${conv.clinic?.name ?? "Klinika"} javob berdi`;
    void db.notification.create({
      data: { userId: conv.userId, type: "INFO", title, body: preview, link: "/xabarlar" },
    }).catch(() => {});
    void pushToUser(conv.userId, { title, body: preview, link: `chat:${conv.id}` });
    if (conv.user.telegramChatId) {
      void tgSend(conv.user.telegramChatId, `💬 <b>${title}</b>\n${preview}\n\nIlovadagi Xabarlar bo'limida javob bering.`);
    }
  }

  return msg;
}

/** Ro'yxat uchun: suhbat + oxirgi xabar + o'qilmaganlar soni */
export async function listConversations(actor: Actor) {
  const where =
    actor.kind === "PATIENT" ? { userId: actor.userId } :
    actor.kind === "CLINIC" ? { clinicId: actor.clinicId, type: "CLINIC" } :
    { type: "SUPPORT" };

  const convs = await db.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      clinic: { select: { name: true, slug: true, photoUrl: true, coverHue: true } },
      user: { select: { name: true, phone: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const isPatient = actor.kind === "PATIENT";
  const result = [];
  for (const c of convs) {
    const since = isPatient ? c.userReadAt : c.staffReadAt;
    const unread = await db.message.count({
      where: {
        conversationId: c.id,
        createdAt: { gt: since },
        senderRole: isPatient ? { not: "PATIENT" } : "PATIENT",
      },
    });
    result.push({
      id: c.id,
      type: c.type,
      title: isPatient
        ? (c.type === "SUPPORT" ? "Qo'llab-quvvatlash" : c.clinic?.name ?? "Klinika")
        : (c.user.name ?? c.user.phone),
      subtitle: c.messages[0] ? (c.messages[0].body || "📷 Rasm") : "Suhbat boshlandi",
      photoUrl: isPatient ? c.clinic?.photoUrl ?? null : null,
      coverHue: c.clinic?.coverHue ?? 200,
      clinicSlug: c.clinic?.slug ?? null,
      lastMessageAt: c.lastMessageAt,
      unread,
    });
  }
  return result;
}
