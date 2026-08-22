"use client";

import { Sheet } from "./ui";

/**
 * Marshrut tanlash: Yandex Maps yoki Google Maps'da ochadi.
 * Telefonda tegishli ilova o'rnatilgan bo'lsa, havola ilovani ochadi.
 */
export default function RouteSheet({
  open, onClose, lat, lng, name, onPick,
}: {
  open: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  name: string;
  onPick?: () => void;
}) {
  const yandexUrl = `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`;
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <Sheet open={open} onClose={onClose} title="Marshrut tuzish">
      <p className="mb-3 text-[13.5px] text-zinc-500">{name} gacha yo&apos;lni qaysi xaritada ochamiz?</p>
      <div className="space-y-2">
        <a
          href={yandexUrl} target="_blank" rel="noreferrer"
          onClick={() => { onPick?.(); onClose(); }}
          className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 font-semibold hover:border-red-300"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-lg font-black text-white">Y</span>
          Yandex Maps
        </a>
        <a
          href={googleUrl} target="_blank" rel="noreferrer"
          onClick={() => { onPick?.(); onClose(); }}
          className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 font-semibold hover:border-sky-300"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-black shadow ring-1 ring-zinc-200">
            <span className="text-sky-500">G</span>
          </span>
          Google Maps
        </a>
      </div>
    </Sheet>
  );
}
