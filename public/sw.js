/* StomGo service worker — FAQAT push bildirishnoma uchun.
 *
 * Diqqat: bu yerda ataylab `fetch` tinglovchisi YO'Q.
 * Avvalgi versiya oflayn kesh qilardi va tarmoq uzilganda so'rovga bosh sahifa
 * HTML'ini zaxira qilib qaytarardi. JavaScript moduliga (masalan MapLibre'ning
 * worker skriptiga) HTML kelsa brauzer uni rad etadi:
 *   "Failed to load module script: non-JavaScript MIME type text/html"
 * Natijada xaritaning vektor qatlamlari chizilmasdi — faqat fon ko'rinardi.
 *
 * Oflayn rejim keyinroq, ehtiyotkorlik bilan qaytariladi. Hozir to'g'ri
 * ishlash muhimroq: so'rovlarga umuman aralashmaymiz.
 */

const CACHE_PREFIX = "stomgo-";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      // Eski versiyalar qoldirgan barcha keshlarni tozalaymiz
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

/* ---------------- Push bildirishnoma ---------------- */

self.addEventListener("push", (e) => {
  let d = { title: "StomGo", body: "Yangi xabar", link: "/" };
  try {
    if (e.data) d = { ...d, ...e.data.json() };
  } catch {
    if (e.data) d.body = e.data.text();
  }
  e.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: d.link || "stomgo",
      renotify: true,
      data: { link: d.link || "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const raw = (e.notification.data && e.notification.data.link) || "/";
  // Ilova ichidagi manzil ko'rinishlari: "chat:<id>" | "appointments" | "/yo'l"
  const path = raw.startsWith("chat:")
    ? `/xabarlar/${raw.slice(5)}`
    : raw === "appointments"
      ? "/profil"
      : raw.startsWith("/") ? raw : "/";

  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(path) && "focus" in c) return c.focus();
      }
      for (const c of list) {
        if ("navigate" in c && "focus" in c) return c.navigate(path).then((w) => w && w.focus());
      }
      return self.clients.openWindow(path);
    })
  );
});
