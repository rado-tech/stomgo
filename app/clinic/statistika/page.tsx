"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Spinner } from "@/components/ui";

type Stats = {
  funnel: {
    profileViews: number; callClicks: number; routeClicks: number;
    bookings: number; confirmed: number; arrived: number; noShow: number; rejected: number;
  };
  days: { date: string; views: number; bookings: number }[];
  avgResponseMin: number | null;
};

/** Bitta seriyali kunlik ustunlar — o'z o'qi bilan alohida grafik */
function Bars({ data, color, title }: { data: { date: string; value: number }[]; color: string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 560, H = 120, PAD = 4;
  const bw = (W - PAD * 2) / data.length;

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-semibold text-zinc-600">{title}</p>
        <p className="text-[12px] text-zinc-400">oxirgi 14 kun · maks: {max}</p>
      </div>
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full">
          {/* orqa fon chizig'i */}
          <line x1={PAD} x2={W - PAD} y1={H} y2={H} stroke="#e4e4e7" strokeWidth="1" />
          {data.map((d, i) => {
            const h = d.value === 0 ? 2 : Math.max(3, (d.value / max) * (H - 8));
            const x = PAD + i * bw + 3;
            const w = Math.max(4, bw - 6);
            return (
              <g key={d.date}>
                <rect
                  x={x} y={H - h} width={w} height={h} rx={3}
                  fill={d.value === 0 ? "#e4e4e7" : color}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
                {/* kattaroq hover maydoni */}
                <rect
                  x={PAD + i * bw} y={0} width={bw} height={H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                />
                {(i === 0 || i === data.length - 1) && (
                  <text x={x + w / 2} y={H + 14} textAnchor="middle" fontSize="10" fill="#a1a1aa">
                    {d.date.slice(5).replace("-", "/")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute -top-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[12px] font-medium text-white shadow"
            style={{ left: `${((hover + 0.5) / data.length) * 100}%`, transform: "translateX(-50%)" }}
          >
            {data[hover].date.slice(5).replace("-", "/")}: <b>{data[hover].value}</b>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-zinc-800">{value}</p>
      {sub && <p className="text-[12px] text-zinc-400">{sub}</p>}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>("/api/clinic/stats").then(setStats);
  }, []);

  if (!stats) return <div className="flex justify-center py-20"><Spinner /></div>;

  const f = stats.funnel;
  const noShowRate = f.confirmed > 0 ? Math.round((f.noShow / f.confirmed) * 100) : 0;
  const convRate = f.profileViews > 0 ? Math.round((f.bookings / f.profileViews) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-xl font-extrabold">Statistika</h1>
      <p className="mb-4 text-[13px] text-zinc-500">Oxirgi 30 kun — bemorlar ilovadan qanday kelayotganini ko&apos;rsatadi</p>

      {/* Voronka */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Profil ko'rishlar" value={f.profileViews} />
        <Tile label="Qo'ng'iroq bosildi" value={f.callClicks} />
        <Tile label="Marshrut ochildi" value={f.routeClicks} />
        <Tile label="Yozuv so'rovlari" value={f.bookings} sub={`konversiya ~${convRate}%`} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Tasdiqlangan" value={f.confirmed} />
        <Tile label="Kelgan bemorlar" value={f.arrived} />
        <Tile label="Kelmaganlar" value={f.noShow} sub={`no-show ~${noShowRate}%`} />
        <Tile label="O'rtacha javob" value={stats.avgResponseMin !== null ? `${stats.avgResponseMin} daq` : "—"} sub="so'rovga javob vaqti" />
      </div>

      {/* Kunlik dinamika — har bir o'lchov o'z grafigida */}
      <div className="mt-4 space-y-3">
        <Bars title="Profil ko'rishlar (kunlik)" color="#0f766e" data={stats.days.map((d) => ({ date: d.date, value: d.views }))} />
        <Bars title="Yozuv so'rovlari (kunlik)" color="#1d4ed8" data={stats.days.map((d) => ({ date: d.date, value: d.bookings }))} />
      </div>

      <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-[12.5px] leading-relaxed text-zinc-500">
        Ko&apos;rsatkichlarni oshirish: narxlarni to&apos;liq kiriting (narxi bor kartochkalar ko&apos;proq ochiladi),
        so&apos;rovlarga 15 daqiqada javob bering (saralashda yuqoriroq chiqasiz), sharhlarga javob yozing.
      </p>
    </div>
  );
}
