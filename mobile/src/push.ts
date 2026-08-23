import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { api, getToken } from "./api";

/**
 * Push bildirishnoma.
 *
 * Muhim: Android'da uzoqdan keladigan push uchun loyihada Firebase (FCM)
 * sozlangan bo'lishi kerak — `android/app/google-services.json`.
 * Fayl bo'lmasa token olinmaydi; ilova baribir normal ishlaydi
 * (bildirishnomalar Telegram va ilova ichidagi qo'ng'iroqcha orqali keladi).
 */

const KEY = "sg_push_token";

// Ilova ochiq turganda ham bildirishnoma ko'rinsin
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Bildirishnomalar",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0f766e",
  });
}

/**
 * Ruxsat so'rash + tokenni serverga yuborish.
 * `silent: true` — ruxsat SO'RALMAYDI: allaqachon berilgan bo'lsagina tokenni yangilaydi.
 * Ilova ochilishida shu rejim ishlatiladi, ruxsat esa Profil bo'limidagi tugma orqali so'raladi.
 */
export async function registerPush(opts?: { silent?: boolean }): Promise<{ ok: boolean; kind?: string; reason?: string }> {
  try {
    if (!Device.isDevice) return { ok: false, reason: "Emulyatorda push ishlamaydi" };
    if (!(await getToken())) return { ok: false, reason: "Avval tizimga kiring" };

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      if (opts?.silent) return { ok: false, reason: "Ruxsat hali berilmagan" };
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return { ok: false, reason: "Ruxsat berilmadi" };

    await ensureChannel();

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    let token: string | null = null;
    let kind: "EXPO" | "FCM" = "FCM";

    // 1) Expo push xizmati — faqat projectId sozlangan bo'lsa
    if (projectId) {
      try {
        const t = await Notifications.getExpoPushTokenAsync({ projectId });
        if (t?.data) { token = t.data; kind = "EXPO"; }
      } catch {
        // Expo yo'li ishlamasa — pastdagi to'g'ridan FCM yo'liga o'tamiz
      }
    }

    // 2) To'g'ridan FCM tokeni — google-services.json yetarli, Expo hisobi shart emas
    if (!token) {
      const d = await Notifications.getDevicePushTokenAsync();
      if (typeof d?.data === "string" && d.data) { token = d.data; kind = "FCM"; }
    }

    if (!token) return { ok: false, reason: "Push tokeni olinmadi" };

    await api("/api/push", { json: { token, kind, platform: Platform.OS } });
    await AsyncStorage.setItem(KEY, token);
    return { ok: true, kind };
  } catch (e) {
    // Ko'p uchraydigan sabab: google-services.json yo'q (FCM sozlanmagan)
    const msg = (e as Error)?.message ?? "";
    if (/FirebaseApp|google-services|FCM|SERVICE_NOT_AVAILABLE|MISSING_INSTANCEID/i.test(msg)) {
      return { ok: false, reason: "Firebase (FCM) sozlanmagan" };
    }
    if (/Network|Failed to fetch|ulanib/i.test(msg)) {
      return { ok: false, reason: "Serverga ulanib bo'lmadi" };
    }
    return { ok: false, reason: "Push yoqilmadi" };
  }
}

/** Chiqishda tokenni serverdan o'chirish */
export async function unregisterPush() {
  const token = await AsyncStorage.getItem(KEY);
  if (!token) return;
  await api("/api/push", { method: "DELETE", json: { token } }).catch(() => {});
  await AsyncStorage.removeItem(KEY);
}

/** Push yoqilganini bilish (Profil ekranidagi holat uchun) */
export async function isPushOn(): Promise<boolean> {
  const token = await AsyncStorage.getItem(KEY);
  if (!token) return false;
  const p = await Notifications.getPermissionsAsync().catch(() => null);
  return p?.status === "granted";
}

export type PushLink = { screen: "Chat"; id: string } | { screen: "Profil" } | null;

/** Bildirishnoma ma'lumotidan qaysi ekran ochilishini aniqlash */
export function parseLink(data: unknown): PushLink {
  const raw = (data as { link?: string } | undefined)?.link ?? "";
  if (raw.startsWith("chat:")) return { screen: "Chat", id: raw.slice(5) };
  if (raw === "appointments" || raw === "/profil") return { screen: "Profil" };
  return null;
}
