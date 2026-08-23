"use client";

import { useEffect } from "react";

/**
 * Service worker'ni ro'yxatdan o'tkazish.
 *
 * Muhim: eski versiya JS so'roviga HTML qaytarib yuborardi va sahifadagi
 * modullar ("Failed to load module script: non-JavaScript MIME type") yuklanmay
 * qolardi — xarita ham shundan ochilmasdi. Shuning uchun har yuklanishda
 * yangilanish majburan tekshiriladi va yangi versiya darhol egallaydi.
 */
export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        if (cancelled) return;
        // Eski nusxa keshda qolib ketmasin
        void reg.update().catch(() => {});

        // Yangi versiya faollashsa — sahifani bir marta yangilaymiz,
        // shunda eski keshdan kelgan buzuq javoblar almashadi.
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  return null;
}
