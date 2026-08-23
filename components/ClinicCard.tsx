"use client";

import Link from "next/link";
import { Stars, Badge, Cover } from "./ui";
import { fmtKm, fmtPrice } from "@/lib/format";
import type { ClinicListItem } from "@/app/api/clinics/route";

export default function ClinicCard({ c }: { c: ClinicListItem }) {
  return (
    <Link
      href={`/klinika/${c.slug}`}
      className="block rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm transition hover:shadow-md"
    >
      <div className="flex gap-3">
        <Cover hue={c.coverHue} name={c.name} photoUrl={c.photoUrl} className="h-16 w-16 shrink-0 rounded-xl text-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold">{c.name}</p>
            {c.isPromo && <Badge color="amber">VIP</Badge>}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-zinc-500">
            <Stars value={c.rating} />
            <span className="font-medium text-zinc-700">{c.rating.toFixed(1)}</span>
            <span>({c.reviewCount})</span>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-zinc-500">
            {c.district} · {fmtKm(c.distanceKm)}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {c.isOpen ? (
          <Badge color="emerald">Ochiq · {c.todayHours}</Badge>
        ) : (
          <Badge color="zinc">Yopiq · {c.todayHours}</Badge>
        )}
        {c.is247 && <Badge color="sky">24/7</Badge>}
        {c.emergency && !c.is247 && <Badge color="orange">Shoshilinch</Badge>}
        {c.hasFemaleDoctor && <Badge color="pink">Ayol shifokor</Badge>}
        {c.childFriendly && <Badge color="violet">Bolalar</Badge>}
        {c.infoStale && <Badge color="zinc">Ma&apos;lumot eskirgan</Badge>}
      </div>

      {/* Eng yaqin bo'sh vaqt va javob tezligi — bemorning "qachon kira olaman"
          va "javob berishadimi" degan savollariga darhol javob */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
        {c.nextSlot && (
          <span className="font-semibold text-emerald-700">
            Bo&apos;sh vaqt: {c.nextSlot.label} {c.nextSlot.time}
          </span>
        )}
        {c.avgResponseMin > 0 && (
          <span className="text-zinc-500">
            ~{c.avgResponseMin} daq ichida javob
            {c.responseRate >= 0.5 && ` · ${Math.round(c.responseRate * 100)}%`}
          </span>
        )}
      </div>

      {c.filteredService ? (
        <p className="mt-2 text-[13px]">
          <span className="text-zinc-500">{c.filteredService.name}:</span>{" "}
          <span className="font-semibold text-teal-700">
            {fmtPrice(c.filteredService.priceMin)} – {fmtPrice(c.filteredService.priceMax)} so&apos;m
          </span>
        </p>
      ) : c.consultPrice !== null ? (
        <p className="mt-2 text-[13px] text-zinc-500">
          Konsultatsiya <span className="font-semibold text-teal-700">{fmtPrice(c.consultPrice)} so&apos;mdan</span>
        </p>
      ) : null}
    </Link>
  );
}
