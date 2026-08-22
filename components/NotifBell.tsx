"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

/** Bosh sahifadagi qo'ng'iroqcha — o'qilmaganlar soni bilan */
export default function NotifBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () => {
      api<{ unread: number }>("/api/notifications")
        .then((d) => { if (alive) setUnread(d.unread); })
        .catch(() => {}); // kirmagan foydalanuvchi — jimgina o'tkazamiz
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <Link
      href="/bildirishnomalar"
      aria-label="Bildirishnomalar"
      className="relative rounded-full p-2 hover:bg-zinc-100"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="text-zinc-700">
        <path d="M18 8a6 6 0 10-12 0c0 6-2 7-2 7h16s-2-1-2-7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" />
      </svg>
      {unread > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
