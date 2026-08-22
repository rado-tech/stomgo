"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Spinner } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import ChatComposer from "@/components/ChatComposer";

type Msg = { id: string; senderRole: string; senderName: string; body: string; imageUrl: string | null; createdAt: string };

/** Panel ichidagi suhbat (klinika va admin uchun) */
export default function ChatPanel({ conversationId, onSent }: { conversationId: string; onSent?: () => void }) {
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [myRole, setMyRole] = useState("CLINIC");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ myRole: string; messages: Msg[] }>(`/api/chat/${conversationId}`);
      setMessages(d.messages);
      setMyRole(d.myRole);
    } catch {
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => { const t = setTimeout(() => { setMessages(null); void load(); }, 0); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (payload: { body: string; imageUrl: string | null }) => {
    const r = await api<{ message: Msg }>(`/api/chat/${conversationId}`, { json: payload });
    setMessages((m) => [...(m ?? []), r.message]);
    onSent?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {!messages ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : messages.length === 0 ? (
          <p className="mt-8 text-center text-[13.5px] text-zinc-500">Hozircha xabar yo&apos;q. Birinchi bo&apos;lib yozing.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === myRole;
            return (
              <div key={m.id} className={`mb-2.5 flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div className={`max-w-[80%] overflow-hidden rounded-2xl ${m.imageUrl ? "p-1.5" : "px-3.5 py-2.5"} ${mine ? "rounded-br-md bg-teal-600 text-white" : "rounded-bl-md bg-zinc-100"}`}>
                  {!mine && <p className={`mb-0.5 text-[11.5px] font-bold text-teal-700 ${m.imageUrl ? "px-2 pt-1" : ""}`}>{m.senderName}</p>}
                  {m.imageUrl && (
                    <a href={m.imageUrl} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.imageUrl} alt="Suhbatdagi rasm" loading="lazy"
                        className="max-h-72 w-full rounded-xl object-cover" />
                    </a>
                  )}
                  {m.body && (
                    <p className={`whitespace-pre-wrap text-[14px] leading-relaxed ${m.imageUrl ? "px-2 pb-1 pt-1.5" : ""}`}>{m.body}</p>
                  )}
                </div>
                <span className="mt-1 text-[10.5px] text-zinc-400">{fmtDateTime(m.createdAt)}</span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <ChatComposer conversationId={conversationId} onSend={send} placeholder="Javob yozing..." />
    </div>
  );
}
