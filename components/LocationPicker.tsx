"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE_URL = "/api/map/style"; // o'z serverimiz orqali (bloklanmaydi)
const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Joylashuv tanlagich: xaritani suring — pin markazda turadi.
 * "Mening joylashuvim" tugmasi GPS bo'yicha olib boradi.
 */
export default function LocationPicker({
  lat, lng, onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onChangeRef = useRef(onChange);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [lng, lat],
      zoom: 14,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    const fallbackTimer = setTimeout(() => {
      if (!map.isStyleLoaded()) map.setStyle(FALLBACK_STYLE);
    }, 8000);
    map.once("load", () => clearTimeout(fallbackTimer));
    map.on("moveend", () => {
      const c = map.getCenter();
      onChangeRef.current(Math.round(c.lat * 1e6) / 1e6, Math.round(c.lng * 1e6) / 1e6);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locateMe = () => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.easeTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 16, duration: 500 });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 6000 }
    );
  };

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-2xl ring-1 ring-zinc-200">
      <div ref={containerRef} className="h-full w-full" />
      {/* Markazdagi pin */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="#0f766e" stroke="#fff" strokeWidth="1">
          <path d="M12 22s-7-5.7-7-12a7 7 0 0114 0c0 6.3-7 12-7 12z" />
          <circle cx="12" cy="10" r="2.8" fill="#fff" />
        </svg>
      </div>
      <button
        type="button"
        onClick={locateMe}
        disabled={locating}
        className="absolute left-2.5 top-2.5 z-10 rounded-full bg-white px-3 py-2 text-[12.5px] font-bold text-teal-700 shadow ring-1 ring-zinc-200"
      >
        {locating ? "..." : "📍 Mening joylashuvim"}
      </button>
      <p className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white">
        Xaritani surib, pinni klinika joyiga keltiring
      </p>
    </div>
  );
}
