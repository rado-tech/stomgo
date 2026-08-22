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

/** Ruxsat so'rash + tokenni serverga yuborish. Kirgan foydalanuvchi uchun chaqiriladi. */
export async function registerPush(): Promise<{ ok: boolean; reason?: string }> {
  try {
    if (!Device.isDevice) return { ok: false, reason: "Emulyatorda push ishlamaydi" };
    if (!(await getToken())) return { ok: false, reason: "Avval tizimga kiring" };

    await ensureChannel();

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return { ok: false, reason: "Ruxsat berilmadi" };

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    const t = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = t.data;
    if (!token) return { ok: false, reason: "Token olinmadi" };

    await api("/api/push", {
      json: { token, kind: "EXPO", platform: Platform.OS },
    });
    await AsyncStorage.setItem(KEY, token);
    return { ok: true };
  } catch (e) {
    // Ko'p uchraydigan sabab: google-services.json yo'q (FCM sozlanmagan)
    const msg = (e as Error)?.message ?? "";
    if (/FirebaseApp|google-services|FCM/i.test(msg)) {
      return { ok: false, reason: "Firebase (FCM) sozlanmagan" };
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
