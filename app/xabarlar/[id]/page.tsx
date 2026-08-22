"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Spinner } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import ChatComposer from "@/components/ChatComposer";

type Msg = { id: string; senderRole: string; senderName: string; body: string; imageUrl: string | null; createdAt: string };

/** Suhbat oynasi — bemor tomoni */
export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [title, setTitle] = useState("Suhbat");
  const [myRole, setMyRole] = useState("PATIENT");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ conversation: { title: string }; myRole: string; messages: Msg[] }>(`/api/chat/${id}`);
      setMessages(d.messages);
      setTitle(d.conversation.title);
      setMyRole(d.myRole);
    } catch {
      setMessages([]);
    }
  }, [id]);

  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (payload: { body: string; imageUrl: string | null }) => {
    const r = await api<{ message: Msg }>(`/api/chat/${id}`, { json: payload });
    setMessages((m) => [...(m ?? []), r.message]);
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-100 bg-white px-4 py-3">
        <button onClick={() => router.push("/xabarlar")} className="rounded-full p-2 text-lg font-bold hover:bg-zinc-100" aria-label="Orqaga">←</button>
        <h1 className="flex-1 truncate text-[17px] font-extrabold">{title}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 rounded-2xl bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-800">
          🔒 Kelishuvlarni faqat shu suhbatda oling. Ilovadan tashqarida (Telegram, telefon)
          qilingan kelishuvlarga platforma javobgar emas.
        </div>

        {!messages ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : messages.length === 0 ? (
          <p className="mt-6 text-center text-[13.5px] text-zinc-500">Savolingizni yozing — javob shu yerda keladi.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === myRole;
            return (
              <div key={m.id} className={`mb-2.5 flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div className={`max-w-[82%] overflow-hidden rounded-2xl ${m.imageUrl ? "p-1.5" : "px-3.5 py-2.5"} ${mine ? "rounded-br-md bg-teal-600 text-white" : "rounded-bl-md bg-white"}`}>
                  {!mine && <p className={`mb-0.5 text-[11.5px] font-bold text-teal-700 ${m.imageUrl ? "px-2 pt-1" : ""}`}>{m.senderName}</p>}
                  {m.imageUrl && (
                    <a href={m.imageUrl} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.imageUrl} alt="Suhbatdagi rasm" loading="lazy"
                        className="max-h-72 w-full rounded-xl object-cover" />
                    </a>
                  )}
                  {m.body && (
                    <p className={`whitespace-pre-wrap text-[14.5px] leading-relaxed ${m.imageUrl ? "px-2 pb-1 pt-1.5" : ""}`}>{m.body}</p>
                  )}
                </div>
                <span className="mt-1 text-[10.5px] text-zinc-400">{fmtDateTime(m.createdAt)}</span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <ChatComposer conversationId={id} onSend={send} />

    </div>
  );
}
