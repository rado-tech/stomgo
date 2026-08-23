"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Badge, Spinner, EmptyState, Toast } from "@/components/ui";
import { APPOINTMENT_STATUS, fmtDateTime } from "@/lib/format";

type Apt = {
  id: string; code: string; status: string;
  requestedAt: string; altAt: string | null; createdAt: string;
  rejectReason: string; note: string; rescheduleCount: number;
  clinic: string; clinicId: string;
  patient: string; phone: string; doctor: string | null;
};

const STATUSES: [string, string][] = [
  ["", "Hammasi"],
  ["PENDING", "Kutilmoqda"],
  ["CONFIRMED", "Tasdiqlangan"],
  ["ALT_OFFERED", "Boshqa vaqt"],
  ["ARRIVED", "Keldi"],
  ["DONE", "Yakunlangan"],
  ["REJECTED", "Rad etilgan"],
  ["CANCELLED", "Bekor qilingan"],
  ["NO_SHOW", "Kelmadi"],
];

/** Barcha yozuvlar — admin ko'radi va aralasha oladi */
export default function AdminAppointmentsPage() {
  const [items, setItems] = useState<Apt[] | null>(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const load = useCallback(() => {
    setItems(null);
    api<{ items: Apt[] }>(`/api/admin/appointments?status=${status}&q=${encodeURIComponent(q)}`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [status, q]);

  useEffect(() => { const t = setTimeout(load, q ? 350 : 0); return () => clearTimeout(t); }, [load, q]);

  const show = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 4000);
  };

  const act = async (a: Apt, action: string) => {
    if (action === "cancel" && !confirm(`${a.patient} (${a.code}) yozuvi bekor qilinsinmi?`)) return;
    setBusy(a.id);
    try {
      await api("/api/admin/appointments", { method: "PATCH", json: { id: a.id, action } });
      show("Bajarildi");
      load();
    } catch (e) {
      show((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-extrabold">Barcha yozuvlar</h1>
      <p className="mt-1 text-[13.5px] text-zinc-500">
        Klinika javob bermay qolsa yoki nizo chiqsa — shu yerdan aralasha olasiz.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {STATUSES.map(([key, label]) => (
          <button
            key={key || "all"} onClick={() => setStatus(key)}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${
              status === key ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Kod, ism yoki raqam"
          className="ml-auto w-56 rounded-xl border border-zinc-200 px-3.5 py-2 text-[13.5px] outline-none focus:border-teal-500"
        />
      </div>

      <div className="mt-4">
        {!items ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="📅" title="Yozuv topilmadi" subtitle="Boshqa filtr bilan urinib ko'ring" />
        ) : (
          <div className="space-y-1.5">
            {items.map((a) => {
              const st = APPOINTMENT_STATUS[a.status];
              const canCancel = !["CANCELLED", "DONE", "NO_SHOW"].includes(a.status);
              const open = openId === a.id;
              return (
                <div key={a.id} className="rounded-xl border border-zinc-100 bg-white">
                  {/* Ixcham qator: bemor, klinika, vaqt, holat — bitta satrda */}
                  <button
                    onClick={() => setOpenId(open ? null : a.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-bold">{a.patient}</span>
                        <span className="shrink-0 font-mono text-[11.5px] text-zinc-400">{a.phone}</span>
                      </div>
                      <p className="truncate text-[12px] text-zinc-500">
                        {a.clinic} · {fmtDateTime(a.requestedAt)}
                        {a.doctor ? ` · ${a.doctor}` : ""}
                        {a.rescheduleCount > 0 ? ` · ${a.rescheduleCount}× ko'chirilgan` : ""}
                      </p>
                    </div>
                    <Badge color={st?.color}>{st?.label ?? a.status}</Badge>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {open && (
                    <div className="border-t border-zinc-100 px-3 py-2.5">
                      <div className="mb-2 space-y-0.5 text-[12.5px] text-zinc-600">
                        <p>
                          <span className="text-zinc-400">Kod:</span>{" "}
                          <span className="font-mono">{a.code}</span>
                          <span className="ml-3 text-zinc-400">Yaratilgan:</span> {fmtDateTime(a.createdAt)}
                        </p>
                        {a.altAt && <p><span className="text-zinc-400">Taklif:</span> {fmtDateTime(a.altAt)}</p>}
                        {a.rejectReason && <p className="text-red-600">Sabab: {a.rejectReason}</p>}
                        {a.note && <p><span className="text-zinc-400">Izoh:</span> {a.note}</p>}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Link href={`/klinika/${a.clinicId}`}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12px] font-semibold">
                          Klinika
                        </Link>
                        {a.status === "PENDING" && (
                          <>
                            <button onClick={() => act(a, "confirm")} disabled={busy === a.id}
                              className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40">
                              Tasdiqlash
                            </button>
                            <button onClick={() => act(a, "reject")} disabled={busy === a.id}
                              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40">
                              Rad etish
                            </button>
                          </>
                        )}
                        {a.status === "CONFIRMED" && (
                          <>
                            <button onClick={() => act(a, "arrived")} disabled={busy === a.id}
                              className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40">
                              Keldi
                            </button>
                            <button onClick={() => act(a, "no_show")} disabled={busy === a.id}
                              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40">
                              Kelmadi
                            </button>
                          </>
                        )}
                        {a.status === "ARRIVED" && (
                          <button onClick={() => act(a, "done")} disabled={busy === a.id}
                            className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40">
                            Yakunlash
                          </button>
                        )}
                        {canCancel && (
                          <button onClick={() => act(a, "cancel")} disabled={busy === a.id}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-[12px] font-semibold text-red-600 disabled:opacity-40">
                            Bekor qilish
                          </button>
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
