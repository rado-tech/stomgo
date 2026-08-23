"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, useGeo } from "@/lib/client";
import { Stars, Badge, Cover, EmptyState, Chip } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import { fmtKm } from "@/lib/format";
import type { ClinicListItem } from "@/app/api/clinics/route";
import SiteFooter from "@/components/SiteFooter";

const SORTS = [
  ["mix", "Tavsiya"], ["rating", "Reyting"], ["distance", "Yaqinlik"], ["price", "Narx"],
] as const;

/** Barcha klinikalar katalogi */
export default function ClinicsPage() {
  const geo = useGeo();
  const [items, setItems] = useState<ClinicListItem[] | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<string>("mix");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("lat", String(geo.lat)); p.set("lng", String(geo.lng));
    p.set("sort", sort);
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }, [geo, q, sort]);

  const load = useCallback(() => {
    api<{ promos: ClinicListItem[]; list: ClinicListItem[] }>(`/api/clinics?${query}`)
      .then((d) => setItems([...d.promos, ...d.list]))
      .catch(() => setItems([]));
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <>
    <TopNav />
    <div className="mx-auto min-h-dvh w-full max-w-6xl pb-24 md:px-6 md:pb-12 md:pt-5">
      <header className="rounded-b-3xl bg-white px-4 pb-4 pt-6 shadow-sm md:rounded-2xl md:px-6 md:pt-5 md:shadow-none md:ring-1 md:ring-zinc-100">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">Klinikalar</h1>
          <span className="md:hidden"><ThemeToggle /></span>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2.5">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9aa4a9" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Klinika nomini kiriting"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-zinc-400"
          />
        </div>

        <div className="scrollbar-none -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
          {SORTS.map(([key, label]) => (
            <Chip key={key} active={sort === key} onClick={() => setSort(key)}>{label}</Chip>
          ))}
        </div>
      </header>

      <div className="px-4 pt-4 md:px-0">
        {!items ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="sg-skeleton h-20" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon="🏥" title="Klinika topilmadi" subtitle="Boshqa nom bilan qidirib ko'ring" />
        ) : (
          <>
            <p className="mb-3 text-[13.5px] text-zinc-500">{items.length} ta klinika</p>
            <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:rounded-none md:bg-transparent xl:grid-cols-3">
              {items.map((c) => (
                <Link key={c.id} href={`/klinika/${c.slug}`} className="flex items-center gap-3 p-3.5 transition hover:bg-zinc-50 md:rounded-2xl md:border md:border-zinc-100 md:bg-white md:hover:shadow-md">
                  <Cover hue={c.coverHue} name={c.name} photoUrl={c.photoUrl} className="h-14 w-14 shrink-0 rounded-full text-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-zinc-500">
                      <Stars value={c.rating} size={11} />
                      {c.rating.toFixed(1)} · {c.reviewCount} sharh
                    </div>
                    <p className="truncate text-[12px] text-zinc-400">{c.district} · {fmtKm(c.distanceKm)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {c.isPromo && <Badge color="amber">VIP</Badge>}
                    <Badge color={c.isOpen ? "emerald" : "zinc"}>{c.isOpen ? "Ochiq" : "Yopiq"}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <SiteFooter />
      <BottomNav />
    </div>
    </>
  );
}
