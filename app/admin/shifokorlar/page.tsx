"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Badge, Spinner, EmptyState, Toast, Cover } from "@/components/ui";
import { SPECIALTY_LABELS, VERIFICATION_LABELS, fmtDate } from "@/lib/format";

type Doc = {
  id: string; name: string; specialty: string; gender: string; experienceYears: number;
  education: string; licenseNo: string; verification: string; isPublic: boolean;
  photoUrl: string | null; clinic: string; clinicSlug: string; createdAt: string;
};

const FILTERS: [string, string][] = [
  ["pending", "Tekshirilmagan"],
  ["verified", "Tekshirilgan"],
  ["all", "Hammasi"],
];

/** Shifokorlarning diplom/ta'lim ma'lumotini tekshirish — faqat admin ko'radi */
export default function AdminDoctorsPage() {
  const [items, setItems] = useState<Doc[] | null>(null);
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const load = useCallback(() => {
    setItems(null);
    api<{ items: Doc[] }>(`/api/admin/doctors?filter=${filter}`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [filter]);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const show = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 4000);
  };

  const setStatus = async (d: Doc, verification: string) => {
    setBusy(d.id);
    try {
      await api("/api/admin/doctors", { method: "PATCH", json: { id: d.id, verification } });
      show(verification === "DOC_VERIFIED" ? "Tekshirilgan deb belgilandi" : "Status qaytarildi");
      load();
    } catch (e) {
      show((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-extrabold">Shifokor hujjatlari</h1>
      <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-zinc-500">
        Ta&apos;lim va diplom raqami <b>bemorga ko&apos;rinmaydi</b> — ular faqat shu yerda,
        tekshiruv uchun. Bemor klinika sahifasida faqat natijani ko&apos;radi:
        «Klinika tasdiqlagan» yoki «Hujjatlari tekshirilgan».
      </p>

      <div className="mt-4 flex gap-1.5">
        {FILTERS.map(([key, label]) => (
          <button
            key={key} onClick={() => setFilter(key)}
            className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
              filter === key ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {!items ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="🩺" title="Shifokor yo'q" subtitle="Bu filtrda hech narsa topilmadi" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((d) => {
              const verified = d.verification === "DOC_VERIFIED";
              return (
                <div key={d.id} className="rounded-2xl border border-zinc-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <Cover hue={200} name={d.name} photoUrl={d.photoUrl} className="h-12 w-12 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-bold">{d.name}</p>
                        <Badge color={verified ? "teal" : "zinc"}>{VERIFICATION_LABELS[d.verification]}</Badge>
                      </div>
                      <p className="text-[13px] text-zinc-500">
                        {SPECIALTY_LABELS[d.specialty] ?? d.specialty} · {d.experienceYears} yil ·{" "}
                        {d.gender === "FEMALE" ? "Ayol" : "Erkak"}
                      </p>
                      <Link href={`/klinika/${d.clinicSlug}`} className="text-[12.5px] font-semibold text-teal-700 hover:underline">
                        {d.clinic}
                      </Link>
                    </div>
                  </div>

                  <dl className="mt-3 space-y-1.5 rounded-xl bg-zinc-50 p-3 text-[13px]">
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-zinc-500">Ta&apos;lim</dt>
                      <dd className={d.education ? "" : "text-zinc-400"}>{d.education || "kiritilmagan"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-zinc-500">Diplom №</dt>
                      <dd className={d.licenseNo ? "font-mono" : "text-zinc-400"}>{d.licenseNo || "kiritilmagan"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-zinc-500">Qo&apos;shilgan</dt>
                      <dd className="text-zinc-500">{fmtDate(d.createdAt)}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {verified ? (
                      <button
                        onClick={() => setStatus(d, "CLINIC_CONFIRMED")} disabled={busy === d.id}
                        className="rounded-xl border border-zinc-300 px-3.5 py-2 text-[12.5px] font-semibold text-zinc-700 disabled:opacity-50"
                      >
                        Tekshiruvni bekor qilish
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatus(d, "DOC_VERIFIED")} disabled={busy === d.id || !d.licenseNo.trim()}
                        className="rounded-xl bg-teal-600 px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
                      >
                        Hujjatlari tekshirildi ✓
                      </button>
                    )}
                    {!d.licenseNo.trim() && !verified && (
                      <span className="text-[12px] text-amber-700">Diplom raqami yo&apos;q — klinikadan so&apos;rang</span>
                    )}
                    {!d.isPublic && <Badge color="zinc">Bemorga ko&apos;rinmaydi</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.msg} error={toast.error} />}
    </div>
  );
}
