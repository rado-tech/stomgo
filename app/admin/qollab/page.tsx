"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Spinner, EmptyState } from "@/components/ui";
import ChatPanel from "@/components/ChatPanel";
import { fmtDateTime } from "@/lib/format";

type Conv = { id: string; title: string; subtitle: string; lastMessageAt: string; unread: number };

/** Admin — qo'llab-quvvatlash suhbatlari */
export default function AdminSupportPage() {
  const [items, setItems] = useState<Conv[] | null>(null);
  const [active, setActive] = useState<Conv | null>(null);

  const load = useCallback(() => {
    api<{ items: Conv[] }>("/api/chat").then((d) => {
      setItems(d.items);
      setActive((a) => (a ? d.items.find((i) => i.id === a.id) ?? a : null));
    }).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  if (!items) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-xl font-extrabold">Qo&apos;llab-quvvatlash</h1>
      <p className="mb-4 text-[13px] text-zinc-500">Foydalanuvchilar yuborgan savollar. Javoblaringiz ilova ichida ko&apos;rinadi.</p>

      {items.length === 0 ? (
        <EmptyState icon="💬" title="Hali xabar yo'q" subtitle="Foydalanuvchilar savol yozganda shu yerda ko'rinadi" />
      ) : (
        <div className="grid gap-4 md:grid-cols-[300px_1fr]">
          {/* Suhbatlar ro'yxati */}
          <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-100 bg-white md:max-h-[70vh] md:overflow-y-auto">
            {items.map((c) => (
              <button key={c.id} onClick={() => setActive(c)}
                className={`flex w-full items-start gap-2 p-3.5 text-left hover:bg-zinc-50 ${active?.id === c.id ? "bg-teal-50" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className={`truncate ${c.unread > 0 ? "font-extrabold" : "font-semibold"}`}>{c.title}</p>
                  <p className="truncate text-[12.5px] text-zinc-500">{c.subtitle}</p>
                  <p className="text-[11px] text-zinc-400">{fmtDateTime(c.lastMessageAt)}</p>
                </div>
                {c.unread > 0 && (
                  <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-[11px] font-bold text-white">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Suhbat */}
          <div className="min-h-[420px] overflow-hidden rounded-2xl border border-zinc-100 bg-white md:h-[70vh]">
            {active ? (
              <>
                <div className="border-b border-zinc-100 px-4 py-3">
                  <p className="font-bold">{active.title}</p>
                </div>
                <div className="h-[calc(100%-53px)]">
                  <ChatPanel conversationId={active.id} onSent={load} />
                </div>
              </>
            ) : (
              <EmptyState icon="👈" title="Suhbatni tanlang" subtitle="Chapdagi ro'yxatdan foydalanuvchini tanlang" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
