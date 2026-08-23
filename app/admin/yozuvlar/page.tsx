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
          <div className="grid gap-3 xl:grid-cols-2">
            {items.map((a) => {
              const st = APPOINTMENT_STATUS[a.status];
              const canCancel = !["CANCELLED", "DONE", "NO_SHOW"].includes(a.status);
              return (
                <div key={a.id} className="rounded-2xl border border-zinc-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{a.patient}</p>
                      <p className="font-mono text-[12.5px] text-zinc-500">{a.phone}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge color={st?.color}>{st?.label ?? a.status}</Badge>
                      <p className="mt-1 font-mono text-[12px] text-zinc-400">{a.code}</p>
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-1 text-[13px]">
                    <p>
                      <span className="text-zinc-500">Klinika:</span>{" "}
                      <Link href={`/klinika/${a.clinicId}`} className="font-semibold text-teal-700">{a.clinic}</Link>
                    </p>
                    <p><span className="text-zinc-500">Vaqt:</span> {fmtDateTime(a.requestedAt)}</p>
                    {a.doctor && <p><span className="text-zinc-500">Shifokor:</span> {a.doctor}</p>}
                    {a.altAt && <p><span className="text-zinc-500">Taklif:</span> {fmtDateTime(a.altAt)}</p>}
                    {a.rescheduleCount > 0 && (
                      <p className="text-[12.5px] text-amber-700">{a.rescheduleCount} marta ko&apos;chirilgan</p>
                    )}
                    {a.rejectReason && <p className="text-[12.5px] text-red-600">Sabab: {a.rejectReason}</p>}
                    {a.note && <p className="text-[12.5px] text-zinc-500">Izoh: {a.note}</p>}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
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
              );
            })}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.msg} error={toast.error} />}
    </div>
  );
}
