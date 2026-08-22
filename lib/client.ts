"use client";

import { useEffect, useState } from "react";
import { TASHKENT_CENTER } from "./geo";

export async function api<T = unknown>(path: string, opts?: RequestInit & { json?: unknown }): Promise<T> {
  const init: RequestInit = { ...opts };
  if (opts?.json !== undefined) {
    init.method = init.method ?? "POST";
    init.headers = { "Content-Type": "application/json", ...(init.headers ?? {}) };
    init.body = JSON.stringify(opts.json);
  }
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Xatolik (${res.status})`);
  return data as T;
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
