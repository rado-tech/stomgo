/* StomGo service worker — PWA uchun */
const CACHE = "stomgo-v3";
const SHELL = ["/", "/triaj", "/profil", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  // API va xarita plitkalari — doim tarmoqdan
  if (url.pathname.startsWith("/api/")) return;

  const isNavigation = e.request.mode === "navigate";
  const isStatic = url.pathname.startsWith("/_next/static");

  // MUHIM: JS/CSS so'roviga HECH QACHON HTML qaytarmaymiz.
  // Avval shunday edi va tarmoq uzilganda brauzer
  // "Failed to load module script: non-JavaScript MIME type text/html"
  // xatosini berardi — natijada xarita moduli yuklanmay qolardi.
  if (isStatic) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ??
          fetch(e.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Sahifalar: network-first, oflaynda keshdan yoki bosh sahifa
  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && url.pathname === "/") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((m) => m ?? caches.match("/")))
    );
    return;
  }

  // Qolganlari (rasm, shrift va h.k.) — tarmoqdan, zaxirasiz
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
