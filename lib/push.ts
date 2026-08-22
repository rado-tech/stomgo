import { db } from "./db";

/**
 * Push bildirishnoma yuborish.
 *
 * Ikki kanal qo'llab-quvvatlanadi:
 *  - EXPO — Android/iOS ilovasi (Expo push xizmati orqali)
 *  - WEB  — brauzer/PWA (VAPID bilan Web Push)
 *
 * Ikkalasi ham ixtiyoriy: kaliti yo'q bo'lsa, o'sha kanal jimgina o'tkazib yuboriladi
 * (Telegram va ilova ichidagi bildirishnoma baribir ishlaydi).
 */

export type PushPayload = {
  title: string;
  body: string;
  /** Ilovada qaysi ekran ochilishi: "chat:<id>" | "appointments" | "notifications" */
  link?: string;
};

const EXPO_URL = "https://exp.host/--/api/v2/push/send";

/** Ishlamay qolgan tokenni o'chirish (qurilma o'chirilgan yoki ilova olib tashlangan) */
async function dropToken(token: string) {
  await db.device.deleteMany({ where: { token } }).catch(() => {});
}

/** Expo push xizmati orqali yuborish */
async function sendExpo(tokens: string[], p: PushPayload) {
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => ({
    to,
    title: p.title,
    body: p.body,
    sound: "default",
    priority: "high",
    channelId: "default",
    data: { link: p.link ?? "" },
  }));

  // Expo bir so'rovda 100 tagacha xabar qabul qiladi
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const r = await fetch(EXPO_URL, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(chunk),
      });
      const j = await r.json().catch(() => null);
      const data = j?.data;
      if (!Array.isArray(data)) continue;
      data.forEach((res: { status?: string; details?: { error?: string } }, idx: number) => {
        if (res?.status === "error" && res.details?.error === "DeviceNotRegistered") {
          void dropToken(chunk[idx].to);
        }
      });
    } catch {
      // tarmoq xatosi — keyingi xabarda qayta urinamiz
    }
  }
}

/** Web Push (VAPID). Kalitlar bo'lmasa — o'tkazib yuboriladi. */
async function sendWeb(
  subs: { token: string; p256dh: string; auth: string }[],
  p: PushPayload
) {
  if (subs.length === 0) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return;

  let webpush;
  try {
    webpush = (await import("web-push")).default;
  } catch {
    return; // kutubxona o'rnatilmagan
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@stomgo.uz", pub, priv);

  const payload = JSON.stringify({ title: p.title, body: p.body, link: p.link ?? "/" });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.token, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        // 404/410 — obuna eskirgan
        if (code === 404 || code === 410) void dropToken(s.token);
      }
    })
  );
}

/** Bitta foydalanuvchining barcha qurilmalariga yuborish */
export async function pushToUser(userId: string, p: PushPayload) {
  const devices = await db.device.findMany({ where: { userId } }).catch(() => []);
  if (devices.length === 0) return;

  await Promise.all([
    sendExpo(devices.filter((d) => d.kind === "EXPO").map((d) => d.token), p),
    sendWeb(
      devices.filter((d) => d.kind === "WEB").map((d) => ({ token: d.token, p256dh: d.p256dh, auth: d.auth })),
      p
    ),
  ]);
}

/** Klinikaning barcha xodimlariga yuborish */
export async function pushToClinic(clinicId: string, p: PushPayload) {
  const staff = await db.user.findMany({ where: { clinicId, role: "CLINIC" }, select: { id: true } }).catch(() => []);
  await Promise.all(staff.map((s) => pushToUser(s.id, p)));
}

/** Barcha adminlarga (qo'llab-quvvatlash uchun) */
export async function pushToAdmins(p: PushPayload) {
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }).catch(() => []);
  await Promise.all(admins.map((a) => pushToUser(a.id, p)));
}
