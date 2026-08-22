"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Spinner, Stars, EmptyState, Toast } from "@/components/ui";

type Rev = { id: string; rating: number; text: string; author: string; clinicName: string; date: string };

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Rev[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ reviews: Rev[] }>("/api/admin/reviews").then((d) => setReviews(d.reviews));
  }, []);
  useEffect(load, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    await api("/api/admin/reviews", { method: "PATCH", json: { id, action } });
    load();
    setToast(action === "approve" ? "Tasdiqlandi — reyting yangilandi" : "Rad etildi");
    setTimeout(() => setToast(null), 2500);
  };

  if (!reviews) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-extrabold">Sharh moderatsiyasi</h1>
      <p className="mb-4 text-[13px] text-zinc-500">Har bir sharh tasdiqlangan tashrifga bog&apos;langan. Haqorat va spam bo&apos;lmasa — tasdiqlang.</p>

      {reviews.length === 0 ? (
        <EmptyState icon="✅" title="Navbat bo'sh" subtitle="Yangi sharhlar shu yerda ko'rinadi" />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-zinc-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{r.clinicName}</p>
                <Stars value={r.rating} />
              </div>
              <p className="mt-1 text-[12.5px] text-zinc-400">{r.author} · {new Date(r.date).toLocaleString("uz-UZ")}</p>
              {r.text && <p className="mt-2 text-[14px]">{r.text}</p>}
              <div className="mt-3 flex gap-2">
                <button onClick={() => act(r.id, "approve")} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-[13px] font-bold text-white">Tasdiqlash</button>
                <button onClick={() => act(r.id, "reject")} className="rounded-lg border border-red-300 px-4 py-1.5 text-[13px] font-semibold text-red-600">Rad etish</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {toast && <Toast message={toast} />}
    </div>
  );
}
