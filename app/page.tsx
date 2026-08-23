"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { api, useGeo } from "@/lib/client";
import { Chip, Sheet, EmptyState, Badge } from "@/components/ui";
import ClinicCard from "@/components/ClinicCard";
import VipStrip from "@/components/VipStrip";
import ThemeToggle from "@/components/ThemeToggle";
import NotifBell from "@/components/NotifBell";
import BottomNav from "@/components/BottomNav";
import type { ClinicListItem } from "@/app/api/clinics/route";
import SiteFooter from "@/components/SiteFooter";
import { useT, LanguageSwitch } from "@/components/I18nProvider";
import type { TranslationKey } from "@/lib/i18n";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

/** Kod -> tarjima kaliti. Nomlar lug'atda (lib/i18n) turadi. */
const SERVICES: readonly (readonly [string, TranslationKey])[] = [
  ["", "home.allServices"],
  ["konsultatsiya", "service.konsultatsiya"], ["plomba", "service.plomba"],
  ["kanal", "service.kanal"], ["tozalash", "service.tozalash"],
  ["oqartirish", "service.oqartirish"], ["olib_tashlash", "service.olib_tashlash"],
  ["akl_tishi", "service.akl_tishi"], ["implant", "service.implant"],
  ["koronka", "service.koronka"], ["protez", "service.protez"],
  ["breket", "service.breket"], ["vinir", "service.vinir"],
  ["bolalar_davolash", "service.bolalar_davolash"],
] as const;

const SORTS: readonly (readonly [string, TranslationKey])[] = [
  ["mix", "home.sortMix"], ["distance", "home.sortDistance"],
  ["rating", "home.sortRating"], ["price", "home.sortPrice"],
] as const;

export default function HomePage() {
  const { t } = useT();
  const geo = useGeo();
  const [view, setView] = useState<"list" | "map">("list");
  const [data, setData] = useState<{ promos: ClinicListItem[]; list: ClinicListItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState<"service" | "sort" | null>(null);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("mix");
  const [service, setService] = useState("");
  const [flags, setFlags] = useState({ openNow: false, female: false, child: false, night: false, urgent: false });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("lat", String(geo.lat)); p.set("lng", String(geo.lng));
    p.set("sort", sort);
    if (q.trim()) p.set("q", q.trim());
    if (service) p.set("service", service);
    if (flags.openNow) p.set("openNow", "1");
    if (flags.female) p.set("female", "1");
    if (flags.child) p.set("child", "1");
    if (flags.night) p.set("night", "1");
    if (flags.urgent) p.set("urgent", "1");
    return p.toString();
  }, [geo, q, sort, service, flags]);

  const load = useCallback(() => {
    setLoading(true);
    api<{ promos: ClinicListItem[]; list: ClinicListItem[] }>(`/api/clinics?${query}`)
      .then(setData)
      .catch(() => setData({ promos: [], list: [] }))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const all = useMemo(() => [...(data?.promos ?? []), ...(data?.list ?? [])], [data]);
  const toggle = (k: keyof typeof flags) => setFlags((f) => ({ ...f, [k]: !f[k] }));

  const listContent = loading && !data ? (
    <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="sg-skeleton h-32" />)}</div>
  ) : all.length === 0 ? (
    <EmptyState icon="🔍" title={t("home.nothingFound")} subtitle={t("home.changeFilters")} />
  ) : (
    <div>
      <VipStrip items={data?.promos ?? []} />
      <div className="space-y-3">
        {data?.list.map((c) => <ClinicCard key={c.id} c={c} />)}
        {(data?.promos.length ?? 0) > 0 && (
          <p className="pt-1 text-[11.5px] text-zinc-400">
            <Badge color="amber">VIP</Badge> belgisi bor klinikalar pullik joylashuvda.
            AI tavsiyalariga reklama ta&apos;sir qilmaydi.
          </p>
        )}
      </div>
    </div>
  );

  return (
    // Desktopda butun ekran balandligi qat'iy — xarita paneli aniq o'lcham oladi
    <div className="flex min-h-dvh flex-col md:h-dvh md:min-h-0">
      {/* ============ SARLAVHA ============ */}
      <header className="z-30 border-b border-zinc-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 pb-2 pt-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <svg width="30" height="30" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0f766e"/><path d="M256 96c-38 0-52 22-88 22-40 0-72 30-72 76 0 34 12 60 26 88 16 32 22 64 28 106 4 28 10 36 22 36 14 0 20-10 24-34 6-38 14-70 30-70h60c16 0 24 32 30 70 4 24 10 34 24 34 12 0 18-8 22-36 6-42 12-74 28-106 14-28 26-54 26-88 0-46-32-76-72-76-36 0-50-22-88-22z" fill="#fff"/></svg>
              <span className="text-xl font-extrabold tracking-tight text-teal-800">StomGo</span>
            </Link>

            {/* Desktop: qidiruv markazda */}
            <div className="hidden flex-1 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 md:flex md:max-w-xl">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" /></svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("home.searchPlaceholder")}
                className="w-full bg-transparent text-[14.5px] outline-none placeholder:text-zinc-400"
              />
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <NotifBell />
              <LanguageSwitch className="hidden md:inline-flex" />
              <ThemeToggle />
              <button
                onClick={() => { setFlags((f) => ({ ...f, urgent: !f.urgent })); setView("list"); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${flags.urgent ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
              >
                {t("home.urgent")}
              </button>
              <button
                onClick={() => setView(view === "list" ? "map" : "list")}
                className="rounded-full bg-zinc-100 px-3.5 py-2 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-200 md:hidden"
              >
                {view === "list" ? t("home.map") : t("home.list")}
              </button>
              <Link href="/klinikalar" className="hidden rounded-full bg-zinc-100 px-3.5 py-2 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-200 md:block">
                {t("nav.clinics")}
              </Link>
              <Link href="/triaj" className="hidden rounded-full bg-zinc-100 px-3.5 py-2 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-200 md:block">
                {t("nav.ai")}
              </Link>
              <Link href="/xabarlar" className="hidden rounded-full bg-zinc-100 px-3.5 py-2 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-200 md:block">
                {t("nav.messages")}
              </Link>
              <Link href="/profil" className="hidden rounded-full bg-zinc-100 px-3.5 py-2 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-200 md:block">
                {t("nav.profile")}
              </Link>
            </div>
          </div>

          {/* Mobil: qidiruv alohida qatorda */}
          <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 md:hidden">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" /></svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("home.searchPlaceholder")}
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-zinc-400"
            />
          </div>

          {/* Filtr chiplari */}
          <div className="scrollbar-none -mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-1">
            <Chip active={!!service} onClick={() => setSheetOpen("service")}>
              {service ? t(SERVICES.find(([c]) => c === service)?.[1] ?? "home.service") : t("home.service")} ▾
            </Chip>
            <Chip active={sort !== "mix"} onClick={() => setSheetOpen("sort")}>
              {t(SORTS.find(([c]) => c === sort)?.[1] ?? "home.sortMix")} ▾
            </Chip>
            <Chip active={flags.openNow} onClick={() => toggle("openNow")}>{t("home.openNow")}</Chip>
            <Chip active={flags.female} onClick={() => toggle("female")}>{t("home.femaleDoctor")}</Chip>
            <Chip active={flags.child} onClick={() => toggle("child")}>{t("home.children")}</Chip>
            <Chip active={flags.night} onClick={() => toggle("night")}>24/7</Chip>
          </div>

          {flags.urgent && (
            <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-800">
              <b>Shoshilinch rejim:</b> hozir ochiq va shoshilinch qabul qiladigan klinikalar, yaqinligi bo&apos;yicha.
            </div>
          )}
        </div>
      </header>

      {/* ============ KONTENT ============ */}
      {/* Desktop: chapda ro'yxat (aylanadigan), o'ngda doimiy xarita */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 md:min-h-0">
        {/* Ro'yxat ustuni */}
        <div className={`w-full px-4 py-3 pb-20 md:w-[430px] md:shrink-0 md:overflow-y-auto md:pb-6 ${view === "map" ? "hidden md:block" : ""}`}>
          {listContent}
        </div>

        {/* Xarita paneli */}
        <div className={`${view === "list" ? "hidden md:block" : ""} fixed inset-x-0 bottom-14 top-[168px] md:static md:my-3 md:mr-4 md:min-h-0 md:flex-1 md:overflow-hidden md:rounded-2xl md:ring-1 md:ring-zinc-200`}>
          <MapView
            clinics={all} center={geo} selected={selected} onSelect={setSelected}
            renderPopup={(c) => <ClinicCard c={c} />}
          />
        </div>
      </div>

      {/* Xizmat tanlash */}
      <Sheet open={sheetOpen === "service"} onClose={() => setSheetOpen(null)} title={t("home.serviceType")}>
        <div className="grid grid-cols-2 gap-2">
          {SERVICES.map(([code, key]) => (
            <button
              key={code}
              onClick={() => { setService(code); setSheetOpen(null); }}
              className={`rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium ${service === code ? "border-teal-600 bg-teal-50 text-teal-800" : "border-zinc-200"}`}
            >
              {t(key)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-zinc-500">{t("home.serviceHint")}</p>
      </Sheet>

      {/* Saralash */}
      <Sheet open={sheetOpen === "sort"} onClose={() => setSheetOpen(null)} title={t("home.sort")}>
        <div className="space-y-2">
          {SORTS.map(([code, key]) => (
            <button
              key={code}
              onClick={() => { setSort(code); setSheetOpen(null); }}
              className={`block w-full rounded-xl border px-4 py-3 text-left text-[14px] font-medium ${sort === code ? "border-teal-600 bg-teal-50 text-teal-800" : "border-zinc-200"}`}
            >
              {t(key)}
              {code === "mix" && <span className="block text-[12px] font-normal text-zinc-500">{t("home.sortMixHint")}</span>}
              {code === "price" && <span className="block text-[12px] font-normal text-zinc-500">{t("home.sortPriceHint")}</span>}
            </button>
          ))}
        </div>
      </Sheet>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}
