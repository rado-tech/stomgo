"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useGeo } from "@/lib/client";
import { Badge, Spinner, EmptyState, Cover, Stars } from "@/components/ui";
import { fmtPrice, fmtKm } from "@/lib/format";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";

type Row = {
  id: string; slug: string; name: string; district: string;
  photoUrl: string | null; coverHue: number;
  rating: number; reviewCount: number; distanceKm: number;
  isOpen: boolean; nextSlot: { label: string; time: string } | null;
  avgResponseMin: number; hasFemaleDoctor: boolean;
  isPromo: boolean; verified: boolean;
  priceMin: number; priceMax: number;
};

type Data = {
  service: { code: string; name: string; category: string };
  stats: { clinicCount: number; min: number | null; max: number | null; median: number | null };
  items: Row[];
};

const SORTS = [
  ["price", "Arzonidan"],
  ["distance", "Yaqinidan"],
  ["rating", "Reyting"],
  ["slot", "Tezroq qabul"],
] as const;

/** Bitta xizmat bo'yicha barcha klinikalar narxi yonma-yon */
export default function PriceComparePage({ params }: { params: Promise<{ kod: string }> }) {
  const { kod } = use(params);
  const router = useRouter();
  const geo = useGeo();
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [sort, setSort] = useState<string>("price");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyFemale, setOnlyFemale] = useState(false);

  const load = useCallback(() => {
    api<Data>(`/api/narxlar?code=${encodeURIComponent(kod)}&lat=${geo.lat}&lng=${geo.lng}`)
      .then(setData)
      .catch((e) => setErr((e as Error).message));
  }, [kod, geo.lat, geo.lng]);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const rows = useMemo(() => {
    let r = [...(data?.items ?? [])];
    if (onlyOpen) r = r.filter((x) => x.isOpen);
    if (onlyFemale) r = r.filter((x) => x.hasFemaleDoctor);
    if (sort === "price") r.sort((a, b) => a.priceMin - b.priceMin);
    else if (sort === "distance") r.sort((a, b) => a.distanceKm - b.distanceKm);
    else if (sort === "rating") r.sort((a, b) => b.rating - a.rating);
    else if (sort === "slot") {
      const rank = (x: Row) => (!x.nextSlot ? 9 : x.nextSlot.label === "Bugun" ? 0 : x.nextSlot.label === "Ertaga" ? 1 : 2);
      r.sort((a, b) => rank(a) - rank(b) || a.priceMin - b.priceMin);
    }
    return r;
  }, [data, sort, onlyOpen, onlyFemale]);

  const cheapest = rows.length ? Math.min(...rows.map((r) => r.priceMin)) : 0;

  return (
    <>
      <TopNav />
      <div className="mx-auto min-h-dvh w-full max-w-5xl pb-24 md:px-6 md:pb-12 md:pt-5">
        <header className="rounded-b-3xl bg-white px-4 pb-4 pt-6 shadow-sm md:rounded-2xl md:px-6 md:pt-5 md:shadow-none md:ring-1 md:ring-zinc-100">
          <button onClick={() => router.push("/narxlar")} className="text-[13px] font-semibold text-teal-700">
            ← Barcha xizmatlar
          </button>

          {err ? (
            <p className="mt-3 text-[14px] text-red-600">{err}</p>
          ) : !data ? (
            <div className="py-6"><Spinner /></div>
          ) : (
            <>
              <h1 className="mt-2 text-2xl font-extrabold">{data.service.name}</h1>
              <p className="mt-1 text-[13.5px] text-zinc-500">
                Toshkentda {data.stats.clinicCount} ta klinikada
              </p>

              {data.stats.min !== null && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {([
                    ["Eng arzon", data.stats.min, "text-emerald-700"],
                    ["O'rtacha", data.stats.median, "text-zinc-800"],
                    ["Eng qimmat", data.stats.max, "text-zinc-500"],
                  ] as const).map(([label, val, cls]) => (
                    <div key={label} className="rounded-xl bg-zinc-50 px-3 py-2 text-center">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</p>
                      <p className={`text-[15px] font-extrabold ${cls}`}>{val !== null ? fmtPrice(val) : "—"}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="scrollbar-none -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
                {SORTS.map(([key, label]) => (
                  <button
                    key={key} onClick={() => setSort(key)}
                    className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                      sort === key ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setOnlyOpen((v) => !v)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                    onlyOpen ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  Hozir ochiq
                </button>
                <button
                  onClick={() => setOnlyFemale((v) => !v)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                    onlyFemale ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  Ayol shifokor
                </button>
              </div>
            </>
          )}
        </header>

        <div className="px-4 pt-4 md:px-0">
          {data && rows.length === 0 ? (
            <EmptyState icon="🏥" title="Klinika topilmadi" subtitle="Filtrlarni yumshating" />
          ) : (
            <div className="space-y-2">
              {rows.map((c) => (
                <Link
                  key={c.id} href={`/klinika/${c.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-3.5 transition hover:shadow-md"
                >
                  <Cover hue={c.coverHue} name={c.name} photoUrl={c.photoUrl} className="h-14 w-14 shrink-0 rounded-xl text-lg" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-bold">{c.name}</p>
                      {c.isPromo && <Badge color="amber">VIP</Badge>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-zinc-500">
                      <Stars value={c.rating} size={11} />
                      {c.rating.toFixed(1)} ({c.reviewCount}) · {c.district} · {fmtKm(c.distanceKm)}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px]">
                      {c.nextSlot ? (
                        <span className="font-semibold text-emerald-700">{c.nextSlot.label} {c.nextSlot.time}</span>
                      ) : (
                        <span className="text-zinc-400">Bo&apos;sh vaqt yo&apos;q</span>
                      )}
                      {c.avgResponseMin > 0 && <span className="text-zinc-400">~{c.avgResponseMin} daq javob</span>}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className={`text-[15px] font-extrabold ${c.priceMin === cheapest ? "text-emerald-700" : "text-zinc-800"}`}>
                      {fmtPrice(c.priceMin)}
                    </p>
                    {c.priceMax > c.priceMin && (
                      <p className="text-[11.5px] text-zinc-400">– {fmtPrice(c.priceMax)}</p>
                    )}
                    {c.priceMin === cheapest && (
                      <span className="mt-0.5 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                        eng arzon
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {data && (
            <p className="mt-4 text-[11.5px] leading-relaxed text-zinc-400">
              Narxlar klinikalar tomonidan kiritilgan va o&apos;zgarishi mumkin.
              Aniq summani qabuldan oldin klinika bilan ilova ichidagi suhbatda tasdiqlang.
            </p>
          )}
        </div>
      </div>
      <BottomNav />
    </>
  );
}
