"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Badge, Spinner, EmptyState, Toast, Cover } from "@/components/ui";
import { SPECIALTY_LABELS, fmtDate } from "@/lib/format";

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
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const load = useCallback(() => {
    setItems(null);
    api<{ items: Doc[] }>(`/api/admin/doctors?filter=${filter}`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [filter]);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const shown = (items ?? []).filter((d) => {
    const t = q.trim().toLowerCase();
    return !t || d.name.toLowerCase().includes(t) || d.clinic.toLowerCase().includes(t);
  });

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

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
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
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Shifokor yoki klinika nomi"
          className="ml-auto w-56 rounded-xl border border-zinc-200 px-3.5 py-2 text-[13px] outline-none focus:border-teal-500"
        />
      </div>

      <div className="mt-4">
        {!items ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon="🩺" title="Shifokor yo'q" subtitle="Bu filtrda hech narsa topilmadi" />
        ) : (
          <div className="space-y-1.5">
            {shown.map((d) => {
              const verified = d.verification === "DOC_VERIFIED";
              const open = openId === d.id;
              const noLicense = !d.licenseNo.trim();
              return (
                <div key={d.id} className="rounded-xl border border-zinc-100 bg-white">
                  {/* Ixcham qator */}
                  <button
                    onClick={() => setOpenId(open ? null : d.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <Cover hue={200} name={d.name} photoUrl={d.photoUrl} className="h-9 w-9 shrink-0 rounded-full text-[13px]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-bold">{d.name}</span>
                        {verified
                          ? <Badge color="teal">Tekshirilgan</Badge>
                          : noLicense
                            ? <Badge color="amber">Diplom yo&apos;q</Badge>
                            : <Badge color="zinc">Kutilmoqda</Badge>}
                        {!d.isPublic && <Badge color="zinc">Yashirin</Badge>}
                      </div>
                      <p className="truncate text-[12px] text-zinc-500">
                        {SPECIALTY_LABELS[d.specialty] ?? d.specialty} · {d.experienceYears} yil ·{" "}
                        {d.gender === "FEMALE" ? "Ayol" : "Erkak"} · {d.clinic}
                      </p>
                    </div>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {open && (
                    <div className="border-t border-zinc-100 px-3 py-2.5">
                      <dl className="mb-2.5 space-y-1 text-[12.5px]">
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-zinc-400">Ta&apos;lim</dt>
                          <dd className={d.education ? "" : "text-zinc-400"}>{d.education || "kiritilmagan"}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-zinc-400">Diplom №</dt>
                          <dd className={d.licenseNo ? "font-mono" : "text-zinc-400"}>{d.licenseNo || "kiritilmagan"}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-zinc-400">Klinika</dt>
                          <dd>
                            <Link href={`/klinika/${d.clinicSlug}`} className="font-semibold text-teal-700 hover:underline">
                              {d.clinic}
                            </Link>
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-zinc-400">Qo&apos;shilgan</dt>
                          <dd className="text-zinc-500">{fmtDate(d.createdAt)}</dd>
                        </div>
                      </dl>

                      <div className="flex flex-wrap items-center gap-2">
                        {verified ? (
                          <button onClick={() => setStatus(d, "CLINIC_CONFIRMED")} disabled={busy === d.id}
                            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50">
                            Tekshiruvni bekor qilish
                          </button>
                        ) : (
                          <button onClick={() => setStatus(d, "DOC_VERIFIED")} disabled={busy === d.id || noLicense}
                            className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40">
                            Hujjatlari tekshirildi ✓
                          </button>
                        )}
                        {noLicense && !verified && (
                          <span className="text-[12px] text-amber-700">Diplom raqami yo&apos;q — klinikadan so&apos;rang</span>
                        )}
                      </div>
                    </div>
                  )}
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
