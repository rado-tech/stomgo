"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useT } from "@/components/I18nProvider";

/** Brauzerning ulanish holatiga obuna — React uchun tashqi manba */
function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getSnapshot = () => navigator.onLine;
// Server tomonda tarmoq bor deb hisoblaymiz — aks holda har sahifada tasma miltillaydi
const getServerSnapshot = () => true;

/**
 * Internet uzilganda ko'rinadigan tasma.
 * Ulanish tiklanganda qisqa vaqt yashil holatda turadi va yo'qoladi —
 * shunda foydalanuvchi qayta urinish mumkinligini biladi.
 */
export default function OfflineBanner() {
  const { t } = useT();
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [restored, setRestored] = useState(false);
  const wasOffline = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Holat FAQAT brauzer hodisasidan o'zgaradi, effekt tanasida emas
  useEffect(() => {
    const onOffline = () => {
      wasOffline.current = true;
      if (timer.current) clearTimeout(timer.current);
      setRestored(false);
    };
    const onOnline = () => {
      if (!wasOffline.current) return;
      wasOffline.current = false;
      setRestored(true);
      timer.current = setTimeout(() => setRestored(false), 3000);
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (online && !restored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[60] px-4 py-2 text-center text-[13px] font-semibold text-white transition ${
        online ? "bg-emerald-600" : "bg-zinc-800"
      }`}
    >
      {online ? t("error.restored") : t("error.offline")}
    </div>
  );
}
