import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

/**
 * API klient: server manzili sozlanadigan (tunnel/domen o'zgarsa ilova qayta
 * yig'ilmaydi — Profil bo'limida manzil almashtiriladi).
 * Sessiya: JWT token (Authorization: Bearer).
 */

const DEFAULT_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "https://negotiations-thank-durable-court.trycloudflare.com";

let cachedUrl: string | null = null;
let cachedToken: string | null | undefined;

export async function getBaseUrl(): Promise<string> {
  if (cachedUrl) return cachedUrl;
  cachedUrl = (await AsyncStorage.getItem("sg_server")) || DEFAULT_URL;
  return cachedUrl;
}

export async function setBaseUrl(url: string) {
  cachedUrl = url.replace(/\/+$/, "");
  await AsyncStorage.setItem("sg_server", cachedUrl);
}

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await AsyncStorage.getItem("sg_token");
  return cachedToken;
}

export async function setToken(token: string | null) {
  cachedToken = token;
  if (token) await AsyncStorage.setItem("sg_token", token);
  else await AsyncStorage.removeItem("sg_token");
}

export async function api<T = unknown>(
  path: string,
  opts?: { method?: string; json?: unknown }
): Promise<T> {
  const base = await getBaseUrl();
  const token = await getToken();
  const init: RequestInit = {
    method: opts?.method ?? (opts?.json !== undefined ? "POST" : "GET"),
    headers: {
      ...(opts?.json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(opts?.json !== undefined ? { body: JSON.stringify(opts.json) } : {}),
  };
  const res = await fetch(`${base}${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Xatolik (${res.status})`);
  return data as T;
}

/** Rasm URL'ini absolyut qilish (server nisbiy /api/files/... qaytaradi) */
export function absUrl(base: string, url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${base}${url}`;
}

/**
 * Rasm yuklash (ko'p qismli forma). Server sharp bilan webp'ga qayta kodlaydi —
 * EXIF/geolokatsiya o'chadi.
 */
export async function uploadImage(
  uri: string,
  fields: Record<string, string>
): Promise<string> {
  const base = await getBaseUrl();
  const token = await getToken();
  const name = uri.split("/").pop() || "photo.jpg";
  const ext = (name.split(".").pop() || "jpg").toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const form = new FormData();
  // React Native'da fayl shu ko'rinishda uzatiladi
  form.append("file", { uri, name, type: mime } as unknown as Blob);
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));

  const res = await fetch(`${base}/api/upload`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Rasm yuklanmadi");
  return (data as { url: string }).url;
}
