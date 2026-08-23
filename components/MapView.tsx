"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ClinicListItem } from "@/app/api/clinics/route";

/**
 * Asosiy uslub — O'Z serverimiz orqali (same-origin proksi):
 * ba'zi tarmoqlar tashqi xarita domenini bloklaydi, o'shanda markerlar
 * ko'rinib, plitkalar yuklanmaydi. Proksi shu muammoni yopadi.
 */
const STYLE_URL = "/api/map/style";
const FALLBACK_STYLES = [
  "https://tiles.openfreemap.org/styles/liberty",
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
];

/**
 * MapLibre v6 worker manzilini `import.meta.url` ga nisbatan hisoblaydi va
 * bundler chunki yonidan `maplibre-gl-worker.mjs` ni qidiradi. Next.js uni
 * u yerga chiqarmaydi — 404 kelib, javob HTML bo'ladi:
 *   "Failed to load module script: non-JavaScript MIME type text/html"
 * Worker ishlamasa VEKTOR qatlamlar chizilmaydi (marker va boshqaruvlar esa
 * ko'rinaveradi — shuning uchun xarita "yarim ishlagandek" tuyuladi).
 *
 * Fayllar scripts/copy-maplibre-worker.mjs orqali public/maplibre/ ga
 * ko'chiriladi (prebuild bosqichida avtomatik).
 */
try {
  maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
} catch {
  // Eski versiyada bunday API bo'lmasligi mumkin — xarita baribir ochiladi
}

/** Xarita chizish uchun WebGL kerak — eski qurilma/drayverlarda o'chiq bo'lishi mumkin */
export function webglSupported(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function MapView({
  clinics, center, selected, onSelect,
}: {
  clinics: ClinicListItem[];
  center: { lat: number; lng: number; granted?: boolean };
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const centerRef = useRef(center);
  const [locating, setLocating] = useState(false);
  const [noWebgl, setNoWebgl] = useState(false);
  const [initError, setInitError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { centerRef.current = center; }, [center]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    if (!webglSupported()) {
      const t = setTimeout(() => setNoWebgl(true), 0);
      return () => clearTimeout(t);
    }

    let disposed = false;
    let styleTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackIdx = -1;
    let styleOk = false;

    /**
     * Xaritani FAQAT konteyner haqiqiy o'lchamga ega bo'lgach yaratamiz.
     * Aks holda MapLibre 400×300 zaxira o'lchamda qotib qoladi va
     * plitkalar ko'rinmaydi (markerlar esa ko'rinaveradi).
     */
    const createMap = () => {
      if (disposed || mapRef.current) return;

      let map: maplibregl.Map;
      try {
        map = new maplibregl.Map({
        container: el,
        style: STYLE_URL,
        center: [centerRef.current.lng, centerRef.current.lat],
        zoom: 11.3,
          attributionControl: { compact: true },
        });
      } catch (e) {
        // Xarita umuman yaratilmasa — bo'sh quti o'rniga sababni ko'rsatamiz
        console.error("Xarita yaratilmadi:", e);
        setInitError((e as Error)?.message ?? "noma'lum xato");
        return;
      }
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

      const styleLoaded = () => {
        if (styleOk) return;
        styleOk = true;
        clearTimeout(styleTimer);
        map.resize();
      };
      map.on("styledata", styleLoaded);
      map.on("load", () => { styleLoaded(); map.resize(); });

      // Uslub umuman kelmasa — navbatma-navbat zaxira manbalar
      const tryNext = () => {
        if (styleOk || disposed) return;
        fallbackIdx++;
        if (fallbackIdx >= FALLBACK_STYLES.length) return;
        console.warn("Xarita: uslub yuklanmadi, zaxira →", FALLBACK_STYLES[fallbackIdx]);
        map.setStyle(FALLBACK_STYLES[fallbackIdx]);
        styleTimer = setTimeout(tryNext, 12000);
      };
      styleTimer = setTimeout(tryNext, 12000);

      map.on("error", (e) => {
        const msg = String((e as { error?: { message?: string } }).error?.message ?? "");
        if (!styleOk && /Failed to fetch|NetworkError|status 4|status 5/i.test(msg)) tryNext();
      });

      // Foydalanuvchi joylashuvi nuqtasi
      const dot = document.createElement("div");
      dot.style.cssText =
        "width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px #2563eb55";
      userMarkerRef.current = new maplibregl.Marker({ element: dot })
        .setLngLat([centerRef.current.lng, centerRef.current.lat])
        .addTo(map);

      setTimeout(() => { if (!disposed) setReady(true); }, 0);
    };

    // O'lcham paydo bo'lishini kutamiz; keyin har o'zgarishda moslaymiz
    const ro = new ResizeObserver(() => {
      if (disposed) return;
      const w = el.clientWidth, h = el.clientHeight;
      if (w > 0 && h > 0) {
        if (!mapRef.current) createMap();
        else mapRef.current.resize();
      }
    });
    ro.observe(el);
    if (el.clientWidth > 0 && el.clientHeight > 0) createMap();

    // Tozalashda ishlatiladigan ref qiymatini shu yerda ushlab qolamiz
    const markers = markersRef.current;
    return () => {
      disposed = true;
      clearTimeout(styleTimer);
      ro.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  // Foydalanuvchi nuqtasini yangilash (geolokatsiya keyin kelsa)
  useEffect(() => {
    userMarkerRef.current?.setLngLat([center.lng, center.lat]);
  }, [center.lat, center.lng]);

  // Klinika markerlari
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = markersRef.current;
    const nextIds = new Set(clinics.map((c) => c.id));

    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) { marker.remove(); existing.delete(id); }
    }

    for (const c of clinics) {
      let marker = existing.get(c.id);
      if (!marker) {
        const el = document.createElement("button");
        el.type = "button";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectRef.current(c.id);
        });
        marker = new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map);
        existing.set(c.id, marker);
      }
      const el = marker.getElement() as HTMLButtonElement;
      el.className = `sg-marker ${c.isOpen ? "" : "closed"} ${selected === c.id ? "selected" : ""}`;
      el.innerHTML = "";
      if (c.photoUrl) {
        const img = document.createElement("img");
        img.src = c.photoUrl;
        img.alt = "";
        img.style.cssText = "width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0";
        el.appendChild(img);
      }
      const span = document.createElement("span");
      span.textContent = c.name;
      el.appendChild(span);
    }
  }, [clinics, selected, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    const c = clinics.find((x) => x.id === selected);
    if (c) map.easeTo({ center: [c.lng, c.lat], zoom: Math.max(map.getZoom(), 13), duration: 400 });
  }, [selected, clinics]);

  /** "Yaqinimda" — foydalanuvchi atrofiga yaqinlashadi */
  const locateMe = () => {
    const map = mapRef.current;
    if (!map) return;
    setLocating(true);
    const goTo = (lat: number, lng: number) => {
      userMarkerRef.current?.setLngLat([lng, lat]);
      map.easeTo({ center: [lng, lat], zoom: 14, duration: 600 });
      setLocating(false);
    };
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => goTo(pos.coords.latitude, pos.coords.longitude),
        () => goTo(center.lat, center.lng),
        { timeout: 6000, maximumAge: 60000 }
      );
    } else {
      goTo(center.lat, center.lng);
    }
  };

  if (initError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-50 px-6 text-center">
        <p className="text-[14px] font-semibold text-zinc-700">Xarita yuklanmadi</p>
        <p className="max-w-sm text-[12.5px] leading-relaxed text-zinc-500">
          Sahifani yangilab ko&apos;ring (Ctrl+Shift+R). Takrorlansa — ro&apos;yxat
          ko&apos;rinishidan foydalaning.
        </p>
        <code className="max-w-full truncate rounded bg-zinc-200 px-2 py-1 text-[11px] text-zinc-600">{initError}</code>
      </div>
    );
  }

  if (noWebgl) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-100 px-8 text-center">
        <p className="text-3xl">🗺️</p>
        <p className="font-bold text-zinc-700">Xarita bu qurilmada ochilmadi</p>
        <p className="text-[13px] text-zinc-500">
          Brauzeringizda WebGL (grafik tezlashtirish) o&apos;chirilgan ko&apos;rinadi.
          Brauzer sozlamalarida &quot;Hardware acceleration&quot;ni yoqing.
          Klinikalarni ro&apos;yxatdan tanlashingiz mumkin.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" onClick={() => onSelect(null)} />
      <button
        onClick={locateMe}
        disabled={locating}
        className="absolute bottom-24 right-2.5 z-10 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-[13px] font-bold text-teal-700 shadow-lg ring-1 ring-zinc-200 active:scale-95 sm:bottom-28"
        aria-label="Yaqinimdagi klinikalar"
      >
        {locating ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <circle cx="12" cy="12" r="8" />
            <path d="M12 1v3M12 20v3M1 12h3M20 12h3" strokeLinecap="round" />
          </svg>
        )}
        Yaqinimda
      </button>
    </div>
  );
}
