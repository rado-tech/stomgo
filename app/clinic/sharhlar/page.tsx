"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Spinner, Stars, EmptyState, Toast } from "@/components/ui";
import { fmtDate } from "@/lib/format";

type Rev = { id: string; rating: number; text: string; reply: string; author: string; date: string };

export default function ClinicReviewsPage() {
  const [reviews, setReviews] = useState<Rev[] | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ reviews: Rev[] }>("/api/clinic/reviews").then((d) => setReviews(d.reviews));
  }, []);
  useEffect(load, [load]);

  const sendReply = async (id: string) => {
    setBusy(true);
    try {
      await api("/api/clinic/reviews", { method: "PATCH", json: { id, reply: replyText } });
      setReplyFor(null); setReplyText(""); load();
      setToast("Javob saqlandi");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setBusy(false);
    }
  };

  if (!reviews) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-extrabold">Sharhlar</h1>
      <p className="mb-4 text-[13px] text-zinc-500">Har bir sharh tasdiqlangan tashrifdan keyin yozilgan. Javob berish ishonchni oshiradi.</p>

      {reviews.length === 0 ? (
        <EmptyState icon="💬" title="Hozircha sharhlar yo'q" />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-zinc-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{r.author}</p>
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-[12px] text-zinc-400">{fmtDate(r.date)}</span>
                </div>
              </div>
              {r.text && <p className="mt-2 text-[14px] text-zinc-600">{r.text}</p>}

              {r.reply ? (
                <div className="mt-2.5 rounded-xl bg-teal-50 p-3 text-[13.5px]">
                  <b className="text-teal-800">Javobingiz:</b> {r.reply}
                </div>
              ) : replyFor === r.id ? (
                <div className="mt-2.5">
                  <textarea
                    value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-[13.5px] outline-none focus:border-teal-500"
                    placeholder="Javobingiz..."
                  />
                  <div className="mt-1.5 flex gap-2">
                    <button disabled={busy} onClick={() => sendReply(r.id)} className="rounded-lg bg-teal-600 px-4 py-1.5 text-[13px] font-bold text-white">Yuborish</button>
                    <button onClick={() => setReplyFor(null)} className="rounded-lg border border-zinc-200 px-4 py-1.5 text-[13px]">Bekor</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setReplyFor(r.id); setReplyText(""); }} className="mt-2 text-[13px] font-semibold text-teal-700">
                  Javob berish →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {toast && <Toast message={toast} />}
    </div>
  );
}
