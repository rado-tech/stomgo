"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

/**
 * Brauzer push bildirishnomasi (Web Push, VAPID).
 * Foydalanuvchi tugmani bosgandagina ruxsat so'raladi — sahifa ochilishida emas.
 */

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "unsupported" | "off" | "on" | "denied" | "busy";

export default function PushSetup() {
  const [state, setState] = useState<State>("off");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (typeof window === "undefined") return;
      const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!ok) { if (alive) setState("unsupported"); return; }
      if (Notification.permission === "denied") { if (alive) setState("denied"); return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (alive) setState(sub ? "on" : "off");
      } catch {
        if (alive) setState("off");
      }
    };
    const t = setTimeout(check, 0);
    return () => { alive = false; clearTimeout(t); };
  }, []);

  const enable = useCallback(async () => {
    setState("busy"); setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("denied"); return; }

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) { setMsg("Server kaliti sozlanmagan"); setState("off"); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await api("/api/push", {
        json: {
          token: j.endpoint, kind: "WEB", platform: "web",
          p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "",
        },
      });
      setState("on");
      setMsg("Yoqildi — endi yangi xabarlar telefoningizga keladi");
    } catch {
      setState("off");
      setMsg("Yoqib bo'lmadi. Brauzer sozlamalarini tekshiring.");
    }
  }, []);

  const disable = useCallback(async () => {
    setState("busy"); setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api("/api/push", { method: "DELETE", json: { token: sub.endpoint } }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }, []);

  const test = useCallback(async () => {
    setMsg("");
    try {
      await api("/api/push", { method: "PUT" });
      setMsg("Sinov bildirishnomasi yuborildi");
    } catch {
      setMsg("Yuborilmadi — avval yoqing");
    }
  }, []);

  if (state === "unsupported") return null;

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-bold">Push bildirishnoma</p>
          <p className="mt-0.5 text-[12.5px] text-zinc-500">
            Klinika javob berganda brauzer orqali xabar keladi
          </p>
        </div>
        {state === "denied" ? (
          <span className="shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-700">
            Bloklangan
          </span>
        ) : state === "on" ? (
          <button onClick={disable} className="shrink-0 rounded-full border border-zinc-300 px-3.5 py-1.5 text-[12.5px] font-semibold text-zinc-700">
            O&apos;chirish
          </button>
        ) : (
          <button onClick={enable} disabled={state === "busy"}
            className="shrink-0 rounded-full bg-teal-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50">
            {state === "busy" ? "..." : "Yoqish"}
          </button>
        )}
      </div>

      {state === "denied" && (
        <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
          Brauzer manzil qatoridagi 🔒 belgisini bosib, «Bildirishnomalar» ruxsatini yoqing.
        </p>
      )}
      {state === "on" && (
        <button onClick={test} className="mt-2 text-[12px] font-semibold text-teal-700 underline">
          Sinab ko&apos;rish
        </button>
      )}
      {msg && <p className="mt-2 text-[12px] text-zinc-500">{msg}</p>}
    </div>
  );
}
