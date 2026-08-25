"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Spinner, EmptyState } from "@/components/ui";
import { fmtPrice } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/categories";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import ThemeToggle from "@/components/ThemeToggle";
import SiteFooter from "@/components/SiteFooter";
import { useT } from "@/components/I18nProvider";

type Item = {
  code: string; name: string; category: string;
  clinicCount: number; from: number | null; to: number | null;
};

/** Xizmatlar bo'yicha narx solishtirish — bosh ro'yxat */
export default function PricesPage() {
  const { t } = useT();
  const [items, setItems] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ items: Item[] }>("/api/narxlar")
        .then((d) => setItems(d.items))
        .catch(() => setItems([]));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const s = q.trim().toLowerCase();
  const shown = (items ?? []).filter((i) => !s || i.name.toLowerCase().includes(s));

  const byCat: Record<string, Item[]> = {};
  for (const i of shown) (byCat[i.category] ??= []).push(i);

  return (
    <>
      <TopNav />
      <div className="mx-auto min-h-dvh w-full max-w-5xl pb-24 md:px-6 md:pb-12 md:pt-5">
        <header className="rounded-b-3xl bg-white px-4 pb-4 pt-6 shadow-sm md:rounded-2xl md:px-6 md:pt-5 md:shadow-none md:ring-1 md:ring-zinc-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold">Narxlarni solishtirish</h1>
              <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-zinc-500">
                Bir xil xizmat klinikalar orasida bir necha barobar farq qiladi.
                Xizmatni tanlang — barcha klinikalar narxi yonma-yon chiqadi.
              </p>
            </div>
            <span className="md:hidden"><ThemeToggle /></span>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={t("prices.searchPlaceholder")}
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-zinc-400"
            />
          </div>
        </header>

        <div className="px-4 pt-4 md:px-0">
          {!items ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : shown.length === 0 ? (
            <EmptyState icon="🔍" title={t("prices.notFound")} subtitle={t("clinics.notFoundHint")} />
          ) : (
            Object.entries(byCat).map(([cat, list]) => (
              <section key={cat} className="mb-5">
                <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-teal-700">
                  {CATEGORY_LABELS[cat] ?? cat}
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {list.map((i) => (
                    <Link
                      key={i.code} href={`/narxlar/${i.code}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-white p-3.5 transition hover:border-teal-300 hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{i.name}</p>
                        <p className="text-[12.5px] text-zinc-500">{i.clinicCount} ta klinikada</p>
                      </div>
                      {i.from !== null && (
                        <div className="shrink-0 text-right">
                          <p className="text-[13px] font-bold text-teal-700">{fmtPrice(i.from)}</p>
                          <p className="text-[11.5px] text-zinc-400">dan boshlab</p>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
