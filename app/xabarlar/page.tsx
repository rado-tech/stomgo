"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, useUser } from "@/lib/client";
import { Cover, EmptyState, Spinner } from "@/components/ui";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import { fmtDateTime } from "@/lib/format";

type Conv = {
  id: string; type: "CLINIC" | "SUPPORT"; title: string; subtitle: string;
  photoUrl: string | null; coverHue: number; lastMessageAt: string; unread: number;
};

/** Suhbatlar: klinikalar + qo'llab-quvvatlash */
export default function ChatsPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [items, setItems] = useState<Conv[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ items: Conv[] }>("/api/chat").then((d) => setItems(d.items)).catch(() => setItems([]));
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const openSupport = async () => {
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/chat", { json: { type: "SUPPORT" } });
      router.push(`/xabarlar/${r.id}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;

  if (!user) {
    return (
      <>
      <TopNav />
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 pb-24">
        <EmptyState icon="💬" title="Suhbatlarni ko'rish uchun kiring"
          subtitle="Klinikalar bilan yozishuv va qo'llab-quvvatlash shu yerda" />
        <Link href="/kirish?next=/xabarlar" className="w-full rounded-2xl bg-teal-600 py-3.5 text-center font-bold text-white">
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
    <div className="mx-auto min-h-dvh w-full max-w-4xl pb-24 md:px-6 md:pb-12 md:pt-5">
      <header className="rounded-b-3xl bg-white px-4 pb-4 pt-6 shadow-sm md:rounded-2xl md:px-6 md:pt-5 md:shadow-none md:ring-1 md:ring-zinc-100">
        <h1 className="text-2xl font-extrabold">Xabarlar</h1>

        <button onClick={openSupport} disabled={busy}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-teal-600 p-4 text-left disabled:opacity-60">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg">🎧</span>
          <span className="flex-1">
            <span className="block font-bold text-white">Qo&apos;llab-quvvatlash</span>
            <span className="block text-[12.5px] text-white/85">Savolingiz bo&apos;lsa — yozing, yordam beramiz</span>
          </span>
          <span className="text-white">›</span>
        </button>
      </header>

      <div className="px-4 pt-4 md:px-0">
        {!items ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="sg-skeleton h-16" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon="💬" title="Hali suhbat yo'q"
            subtitle="Klinika sahifasidagi «Xabar yozish» tugmasi orqali savol bering" />
        ) : (
          <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white">
            {items.map((c) => (
              <Link key={c.id} href={`/xabarlar/${c.id}`} className="flex items-center gap-3 p-3.5 hover:bg-zinc-50">
                {c.type === "SUPPORT" ? (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xl">🎧</span>
                ) : (
                  <Cover hue={c.coverHue} name={c.title} photoUrl={c.photoUrl} className="h-12 w-12 shrink-0 rounded-full" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`truncate ${c.unread > 0 ? "font-extrabold" : "font-semibold"}`}>{c.title}</p>
                  <p className={`truncate text-[13px] ${c.unread > 0 ? "text-zinc-700" : "text-zinc-500"}`}>{c.subtitle}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] text-zinc-400">{fmtDateTime(c.lastMessageAt).split(",")[0]}</span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-[11px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
    </>
  );
}
