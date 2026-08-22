"use client";

import Link from "next/link";
import { Cover } from "./ui";
import { fmtKm, fmtPrice } from "@/lib/format";
import type { ClinicListItem } from "@/app/api/clinics/route";

/**
 * VIP e'lonlar — pullik joylashuvdagi klinikalar lentasi.
 * Faqat ro'yxat tartibiga ta'sir qiladi; AI tavsiyalari bunga bog'liq emas.
 */
export default function VipStrip({ items }: { items: ClinicListItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-zinc-900">VIP e&apos;lonlar</h2>
        <span className="text-[11.5px] text-zinc-400">Reklama</span>
      </div>

      <div className="sg-noscroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/klinika/${c.slug}`}
            className="relative w-[228px] shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
          >
            <Cover hue={c.coverHue} name={c.name} photoUrl={c.photoUrl} className="h-24 w-full rounded-none text-3xl" />
            <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10.5px] font-extrabold text-amber-950">
              VIP
            </span>

            <div className="p-3">
              <p className="truncate text-[14px] font-bold text-zinc-900">{c.name}</p>
              <p className="mt-0.5 truncate text-[12px] text-zinc-500">
                {c.district} · {fmtKm(c.distanceKm)}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-amber-700">★ {c.rating.toFixed(1)}</span>
                {c.consultPrice !== null && (
                  <span className="text-[12px] font-semibold text-teal-700">
                    {fmtPrice(c.consultPrice)} so&apos;mdan
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
