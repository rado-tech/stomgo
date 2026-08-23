"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useUser } from "@/lib/client";
import { Spinner, EmptyState } from "@/components/ui";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import { fmtDateTime } from "@/lib/format";

type Notif = { id: string; title: string; body: string; link: string; readAt: string | null; createdAt: string };

export default function NotificationsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [data, setData] = useState<{ items: Notif[]; unread: number } | null>(null);

  const load = useCallback(() => {
    api<{ items: Notif[]; unread: number }>("/api/notifications")
      .then(setData)
      .catch(() => setData({ items: [], unread: 0 }));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const markAllRead = async () => {
    await api("/api/notifications", { method: "PATCH", json: { all: true } });
    setData((d) => d ? { items: d.items.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })), unread: 0 } : d);
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;

  if (!user) {
    return (
      <>
      <TopNav />
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 pb-20">
        <EmptyState icon="🔔" title="Bildirishnomalarni ko'rish uchun kiring" />
        <Link href="/kirish?next=/bildirishnomalar" className="w-full rounded-2xl bg-teal-600 py-3.5 text-center font-bold text-white">
          Kirish
        </Link>
        <BottomNav />
      </div>
      </>
    );
  }

  return (
    <>
    <TopNav />
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-24 pt-5 md:pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => (window.history.length > 2 ? router.back() : router.push("/"))}
          className="rounded-full p-2 text-lg font-bold hover:bg-zinc-100" aria-label="Orqaga">←</button>
        <h1 className="flex-1 text-xl font-extrabold">Bildirishnomalar</h1>
        {(data?.unread ?? 0) > 0 && (
          <button onClick={markAllRead} className="text-[13px] font-semibold text-teal-700">
            Hammasini o&apos;qildi
          </button>
        )}
      </div>

      {!data ? (
        <div className="mt-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="sg-skeleton h-20" />)}</div>
      ) : data.items.length === 0 ? (
        <EmptyState icon="🔕" title="Hozircha bildirishnoma yo'q"
          subtitle="Yozuv tasdiqlanganda va profilaktik ko'rik vaqti kelganda shu yerda ko'rasiz" />
      ) : (
        <div className="mt-4 space-y-2.5">
          {data.items.map((n) => (
            <Link key={n.id} href={n.link || "/profil"}
              className={`block rounded-2xl border bg-white p-4 ${n.readAt ? "border-zinc-100" : "border-l-4 border-l-teal-500 border-zinc-100"}`}>
              <p className={`text-[14.5px] ${n.readAt ? "font-medium" : "font-bold"}`}>{n.title}</p>
              {n.body && <p className="mt-1 text-[13px] text-zinc-500">{n.body}</p>}
              <p className="mt-1.5 text-[11.5px] text-zinc-400">{fmtDateTime(n.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
    </>
  );
}
