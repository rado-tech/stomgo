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

/** Tarmoq yetib bormaganda — serverdan kelgan xatodan ajratish uchun */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

const TIMEOUT_MS = 20_000;
const OFFLINE_MSG = "Serverga ulanib bo'lmadi. Internetni tekshirib, qayta urining.";
const SLOW_MSG = "Server javob bermadi. Aloqa sust — qayta urining.";

// ---------- Ulanish holati ----------
// Alohida paket (netinfo) qo'shmaymiz: ilova hajmi oshmasin va aslida
// muhimi "wifi bormi" emas, "O'Z serverimizga yetib boryapmizmi".
let reachable = true;
const listeners = new Set<() => void>();

function setReachable(v: boolean) {
  if (reachable === v) return;
  reachable = v;
  listeners.forEach((l) => l());
}

/** React uchun: useSyncExternalStore(subscribeReachable, isReachable) */
export function subscribeReachable(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}
export const isReachable = () => reachable;

export async function api<T = unknown>(
  path: string,
  opts?: { method?: string; json?: unknown }
): Promise<T> {
  const base = await getBaseUrl();
  const token = await getToken();
  const method = opts?.method ?? (opts?.json !== undefined ? "POST" : "GET");
  const init: RequestInit = {
    method,
    headers: {
      ...(opts?.json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(opts?.json !== undefined ? { body: JSON.stringify(opts.json) } : {}),
  };

  // Yozuv so'rovini qayta yubormaymiz — qabul ikki marta yozilib qolmasin
  const attempts = method === "GET" ? 2 : 1;
  let timedOut = false;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, TIMEOUT_MS);
    try {
      const res = await fetch(`${base}${path}`, { ...init, signal: controller.signal });
      const data = await res.json().catch(() => ({}));
      setReachable(true);
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `Xatolik (${res.status})`);
      return data as T;
    } catch (e) {
      // Server javob bergan, lekin xato — tarmoq muammosi emas
      if (e instanceof Error && e.name !== "AbortError" && e.name !== "TypeError") throw e;
      if (attempt < attempts - 1) await new Promise((r) => setTimeout(r, 700));
    } finally {
      clearTimeout(timer);
    }
  }

  setReachable(false);
  throw new NetworkError(timedOut ? SLOW_MSG : OFFLINE_MSG);
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

  // Kamera surati 5-12 MB bo'lishi mumkin — qurilmaning o'zida kichraytiramiz.
  // Tashxis uchun 1600px yetarli, hajm ~300 KB ga tushadi.
  //
  // Yuborish usuli: multipart EMAS, base64 JSON. React Native'da multipart fayl
  // URI'si bilan ishlashda "Network request failed" tez-tez uchraydi (URI sxemasi,
  // vaqtinchalik fayl, tunnel orqali chunked uzatish). JSON ishonchliroq.
  let dataBase64: string | null = null;
  try {
    const { ImageManipulator, SaveFormat } = await import("expo-image-manipulator");
    const ctx = ImageManipulator.manipulate(uri).resize({ width: 1600 });
    const rendered = await ctx.renderAsync();
    const out = await rendered.saveAsync({ compress: 0.75, format: SaveFormat.JPEG, base64: true });
    if (out?.base64) dataBase64 = out.base64;
  } catch {
    // pastda zaxira yo'l bor
  }

  // Zaxira: kichraytirib bo'lmasa faylni o'zini o'qiymiz
  if (!dataBase64) {
    try {
      const FS = await import("expo-file-system/legacy");
      dataBase64 = await FS.readAsStringAsync(uri, { encoding: "base64" });
    } catch {
      throw new Error("Rasmni o'qib bo'lmadi. Boshqa rasm tanlab ko'ring.");
    }
  }

  // ~8 MB serverdagi chegara; base64 ~33% kattaroq bo'ladi
  if (dataBase64.length > 10_000_000) {
    throw new Error("Rasm juda katta. Kichikroq rasm tanlang.");
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);

  let res: Response;
  try {
    res = await fetch(`${base}/api/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...fields, dataBase64 }),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const aborted = (e as Error)?.name === "AbortError";
    throw new Error(
      aborted
        ? "Internet sekin — rasm yuborilmadi. Qayta urining."
        : "Serverga ulanib bo'lmadi. Internetni yoki Profil > Server sozlamasini tekshiring."
    );
  }
  clearTimeout(timer);

  const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
  if (!res.ok) throw new Error(data.error ?? `Rasm yuklanmadi (${res.status})`);
  if (!data.url) throw new Error("Server rasm manzilini qaytarmadi");
  return data.url;
}


