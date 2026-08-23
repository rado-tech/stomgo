"use client";

import { useEffect, useState } from "react";

/**
 * Saytni telefonga ilova sifatida o'rnatish taklifi.
 * O'rnatilgach manzil qatori yo'qoladi va ilovadek ochiladi (standalone).
 *
 * Android/Chrome: brauzer `beforeinstallprompt` beradi — bir bosishda o'rnatiladi.
 * iOS/Safari: bunday hodisa yo'q, shuning uchun qo'lda yo'riqnoma ko'rsatiladi.
 */

type Choice = { outcome: "accepted" | "dismissed" };
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<Choice> };

const HIDE_KEY = "sg_install_hidden";

export default function InstallPrompt() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Allaqachon ilova sifatida ochilgan bo'lsa — taklif kerak emas
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    let dismissed = false;
    try { dismissed = localStorage.getItem(HIDE_KEY) === "1"; } catch { /* xotira yopiq */ }
    if (dismissed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari: hodisa yo'q — yo'riqnoma ko'rsatamiz
    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) {
      const t = setTimeout(() => { setIosHint(true); setHidden(false); }, 2500);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onPrompt); };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const close = () => {
    setHidden(true);
    try { localStorage.setItem(HIDE_KEY, "1"); } catch { /* xotira yopiq */ }
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") setHidden(true);
    setEvt(null);
  };

  if (hidden || (!evt && !iosHint)) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 rounded-2xl border border-teal-200 bg-white p-3.5 shadow-lg md:inset-x-auto md:bottom-5 md:right-5 md:max-w-sm">
      <div className="flex items-start gap-3">
        <svg width="38" height="38" viewBox="0 0 512 512" className="shrink-0" aria-hidden>
          <rect width="512" height="512" rx="112" fill="#0f766e" />
          <path d="M256 96c-38 0-52 22-88 22-40 0-72 30-72 76 0 34 12 60 26 88 16 32 22 64 28 106 4 28 10 36 22 36 14 0 20-10 24-34 6-38 14-70 30-70h60c16 0 24 32 30 70 4 24 10 34 24 34 12 0 18-8 22-36 6-42 12-74 28-106 14-28 26-54 26-88 0-46-32-76-72-76-36 0-50-22-88-22z" fill="#fff" />
        </svg>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold">StomGo&apos;ni telefonga o&apos;rnating</p>
          {iosHint ? (
            <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-600">
              Pastdagi <b>Ulashish</b> tugmasini bosing → <b>«Bosh ekranga qo&apos;shish»</b>.
              Shunda ilovadek ochiladi.
            </p>
          ) : (
            <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-600">
              Ilovadek ishlaydi: bosh ekranda ikonka, tez ochiladi, bildirishnoma keladi.
            </p>
          )}

          <div className="mt-2.5 flex gap-2">
            {!iosHint && (
              <button onClick={install} className="rounded-xl bg-teal-600 px-4 py-2 text-[13px] font-bold text-white">
                O&apos;rnatish
              </button>
            )}
            <button onClick={close} className="rounded-xl border border-zinc-200 px-4 py-2 text-[13px] font-semibold text-zinc-600">
              Keyinroq
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
