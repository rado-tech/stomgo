"use client";

import { useRef, useState } from "react";

/**
 * Xabar yozish paneli — matn va rasm (tish surati).
 * Rasm avval /api/upload ga yuboriladi (sharp webp'ga qayta kodlaydi, EXIF o'chadi),
 * so'ng xabar bilan birga URL yuboriladi.
 */
export default function ChatComposer({
  conversationId,
  onSend,
  placeholder = "Xabar yozing...",
}: {
  conversationId: string;
  onSend: (payload: { body: string; imageUrl: string | null }) => Promise<void>;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setErr(""); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("target", "chat");
      fd.append("conversationId", conversationId);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Rasm yuklanmadi");
      setImage(j.url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !image) || sending) return;
    setSending(true);
    const snapshot = { body, image };
    setText(""); setImage(null); setErr("");
    try {
      await onSend({ body, imageUrl: snapshot.image });
    } catch (e) {
      setText(snapshot.body); setImage(snapshot.image);
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-zinc-100 bg-white px-3 py-2.5">
      {image && (
        <div className="relative mb-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Yuboriladigan rasm" className="h-20 w-20 rounded-xl object-cover" />
          <button onClick={() => setImage(null)} aria-label="Rasmni olib tashlash"
            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[13px] font-bold text-white">
            ×
          </button>
        </div>
      )}
      {err && <p className="mb-1.5 text-[12px] text-red-600">{err}</p>}

      <div className="flex items-end gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => pick(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          aria-label="Rasm biriktirish"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 disabled:opacity-50">
          {uploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <circle cx="8.5" cy="9.5" r="1.5" />
              <path d="M21 16l-4.5-4.5L7 21" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <textarea
          value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          rows={1} placeholder={placeholder}
          className="max-h-28 flex-1 resize-none rounded-2xl bg-zinc-100 px-4 py-2.5 text-[14.5px] outline-none"
        />

        <button onClick={send} disabled={(!text.trim() && !image) || sending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white disabled:opacity-40"
          aria-label="Yuborish">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.5-8.4L3.4 3.6 3.4 10l12 2-12 2z" /></svg>
        </button>
      </div>
    </div>
  );
}
