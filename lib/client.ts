"use client";

import { useEffect, useState } from "react";
import { TASHKENT_CENTER } from "./geo";

/** Tarmoq yetib bormaganda — serverdan kelgan xatodan ajratish uchun */
export class NetworkError extends Error {
  readonly offline: boolean;
  constructor(message: string, offline: boolean) {
    super(message);
    this.name = "NetworkError";
    this.offline = offline;
  }
}

const TIMEOUT_MS = 20_000;

const OFFLINE_MSG = "Internet yo'q. Ulanishni tekshirib, qayta urining.";
const SLOW_MSG = "Server javob bermadi. Aloqa sust bo'lishi mumkin — qayta urining.";

/** Faqat o'qish so'rovlarini qayta urinish xavfsiz (yozuv ikki marta ketmasin) */
function isRetryable(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

export async function api<T = unknown>(path: string, opts?: RequestInit & { json?: unknown }): Promise<T> {
  const init: RequestInit = { ...opts };
  if (opts?.json !== undefined) {
    init.method = init.method ?? "POST";
    init.headers = { "Content-Type": "application/json", ...(init.headers ?? {}) };
    init.body = JSON.stringify(opts.json);
  }
  const method = (init.method ?? "GET").toUpperCase();

  // Brauzer o'zi bilsa — so'rov yubormasdan darhol aytamiz
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new NetworkError(OFFLINE_MSG, true);
  }

  const attempts = isRetryable(method) ? 2 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    // Osib qolgan so'rov abadiy kutib turmasin
    const timer = AbortSignal.timeout(TIMEOUT_MS);
    const signal = init.signal ? AbortSignal.any([init.signal, timer]) : timer;

    try {
      const res = await fetch(path, { ...init, signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `Xatolik (${res.status})`);
      return data as T;
    } catch (e) {
      // Server javob bergan, lekin xato — bu tarmoq muammosi emas, qayta urinmaymiz
      if (e instanceof Error && e.name !== "AbortError" && e.name !== "TimeoutError" && e.name !== "TypeError") {
        throw e;
      }
      lastError = e;
      // Oxirgi urinish bo'lmasa — qisqa kutib qayta urinamiz
      if (attempt < attempts - 1) await new Promise((r) => setTimeout(r, 700));
    }
  }

  const timedOut = lastError instanceof Error && (lastError.name === "TimeoutError" || lastError.name === "AbortError");
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  throw new NetworkError(offline ? OFFLINE_MSG : timedOut ? SLOW_MSG : OFFLINE_MSG, offline);
}

export type Me = {
  id: string; name: string | null; phone: string; role: string;
  clinicId?: string | null; photoUrl?: string | null; username?: string | null;
  birthYear?: number | null; gender?: string | null;
};

export function useUser() {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<{ user: Me | null }>("/api/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  return { user, loading, setUser };
}

export type Geo = { lat: number; lng: number; granted: boolean };

/** Geolokatsiya — ruxsat berilmasa Toshkent markazi ishlatiladi */
export function useGeo(): Geo {
  const [geo, setGeo] = useState<Geo>({ ...TASHKENT_CENTER, granted: false });
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, granted: true }),
      () => {},
      { timeout: 5000, maximumAge: 300000 }
    );
  }, []);
  return geo;
}
