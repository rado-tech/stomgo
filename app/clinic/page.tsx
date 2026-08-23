"use client";

import Link from "next/link";
import ClinicBookForm from "@/components/ClinicBookForm";
import TimeInput from "@/components/TimeInput";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Badge, Sheet, Spinner, EmptyState, Toast } from "@/components/ui";
import { APPOINTMENT_STATUS, fmtDate, fmtDateTime } from "@/lib/format";

type Apt = {
  id: string; patientName: string; patientPhone: string; doctorName: string | null;
  serviceCode: string | null; requestedAt: string; altAt: string | null;
  status: string; note: string; code: string; createdAt: string; overdue: boolean;
};

const GROUPS: { key: string; title: string; statuses: string[] }[] = [
  { key: "new", title: "Yangi so'rovlar", statuses: ["PENDING"] },
  { key: "waiting", title: "Javob kutilmoqda", statuses: ["ALT_OFFERED"] },
  { key: "confirmed", title: "Tasdiqlangan", statuses: ["CONFIRMED"] },
  { key: "done", title: "Yakunlangan / boshqa", statuses: ["ARRIVED", "DONE", "NO_SHOW", "REJECTED", "CANCELLED"] },
];

export default function ClinicAppointmentsPage() {
  const [data, setData] = useState<{ items: Apt[]; clinicName?: string; clinicSlug?: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [altFor, setAltFor] = useState<Apt | null>(null);
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("");
  const [rejectFor, setRejectFor] = useState<Apt | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ items: Apt[]; clinicName?: string; clinicSlug?: string }>("/api/clinic/appointments")
      .then(setData)
      .catch(() => setData({ items: [] }));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000); // yangi so'rovlarni kuzatish
    return () => clearInterval(t);
  }, [load]);

  const showToast = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  };

  const act = async (id: string, body: object, onDone?: () => void) => {
    setBusy(true);
    try {
      await api(`/api/clinic/appointments/${id}`, { method: "PATCH", json: body });
      load();
      onDone?.();
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;

  const pendingCount = data.items.filter((a) => a.status === "PENDING").length;

  // Bugungi ko'rsatkichlar — allaqachon yuklangan ro'yxatdan hisoblanadi
  const todayKey = fmtDate(new Date());
  const today = data.items.filter((a) => fmtDate(a.requestedAt) === todayKey);
  const kpis: { label: string; value: number; tone?: "alert" | "good" }[] = [
    { label: "Bugungi qabullar", value: today.length },
    { label: "Javob kutmoqda", value: pendingCount, tone: pendingCount > 0 ? "alert" : undefined },
    { label: "Tasdiqlangan", value: today.filter((a) => a.status === "CONFIRMED").length, tone: "good" },
    { label: "Kelgan", value: today.filter((a) => a.status === "ARRIVED" || a.status === "DONE").length, tone: "good" },
    { label: "Kelmagan", value: today.filter((a) => a.status === "NO_SHOW").length, tone: "alert" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">{data.clinicName} — yozuvlar</h1>
          <p className="text-[13px] text-zinc-500">
            {pendingCount > 0 ? `${pendingCount} ta yangi so'rov javob kutmoqda` : "Yangi so'rovlar yo'q"}
          </p>
        </div>
        <Link href="/clinic/qr" className="rounded-xl bg-teal-50 px-4 py-2 text-[13px] transition hover:bg-teal-100">
          <b className="text-teal-800">QR kod →</b>
          <p className="text-[11px] text-teal-600">Resepshn stoliga qo&apos;ying — bemor skanerlab kelganini tasdiqlaydi</p>
        </Link>
      </div>

      {/* Bugungi holat — bir qarashda */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-zinc-100 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{k.label}</p>
            <p className={`mt-0.5 text-2xl font-extrabold ${
              k.value === 0 ? "text-zinc-300"
                : k.tone === "alert" ? "text-amber-600"
                : k.tone === "good" ? "text-emerald-600" : ""
            }`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Xodim bemorni o'zi yozib qo'yishi (suhbatda kelishilgan bo'lsa) */}
      {data.clinicSlug && (
        <div className="mb-4">
          <ClinicBookForm slug={data.clinicSlug} onDone={load} />
        </div>
      )}

      {data.items.length === 0 ? (
        <EmptyState icon="📭" title="Hozircha yozuvlar yo'q" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {GROUPS.map((g) => {
            const items = data.items.filter((a) => g.statuses.includes(a.status));
            if (!items.length) return null;
            return (
              <section key={g.key} className="rounded-2xl border border-zinc-100 bg-white p-3">
                <h2 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-wide text-zinc-500">
                  {g.title} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map((a) => {
                    const st = APPOINTMENT_STATUS[a.status];
                    return (
                      <div key={a.id} className={`rounded-xl border p-3 ${a.overdue ? "border-red-300 bg-red-50" : "border-zinc-100"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{a.patientName}</p>
                            <a href={`tel:${a.patientPhone}`} className="text-[13px] text-teal-700">{a.patientPhone}</a>
                          </div>
                          <Badge color={st?.color}>{st?.label}</Badge>
                        </div>
                        <p className="mt-1.5 text-[13.5px]">
                          🕐 <b>{fmtDateTime(a.requestedAt)}</b>
                          {a.doctorName && <span className="text-zinc-500"> · {a.doctorName}</span>}
                        </p>
                        {a.note && <p className="mt-1 rounded-lg bg-zinc-50 p-2 text-[13px] text-zinc-600">{a.note}</p>}
                        {a.overdue && <p className="mt-1 text-[12px] font-bold text-red-600">⚠ 15 daqiqadan oshdi — bemor kutmoqda!</p>}

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {a.status === "PENDING" && (
                            <>
                              <button disabled={busy} onClick={() => act(a.id, { action: "confirm" })}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12.5px] font-bold text-white">Tasdiqlash ✓</button>
                              <button disabled={busy} onClick={() => { setAltFor(a); setAltDate(""); setAltTime(""); }}
                                className="rounded-lg border border-sky-500 px-3 py-1.5 text-[12.5px] font-semibold text-sky-700">Boshqa vaqt</button>
                              <button disabled={busy} onClick={() => { setRejectFor(a); setRejectReason(""); }}
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-[12.5px] font-semibold text-red-600">Rad etish</button>
                            </>
                          )}
                          {a.status === "CONFIRMED" && (
                            <>
                              <button disabled={busy} onClick={() => act(a.id, { action: "arrived" })}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12.5px] font-bold text-white">Keldi ✓</button>
                              <button disabled={busy} onClick={() => act(a.id, { action: "no_show" })}
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-[12.5px] font-semibold text-red-600">Kelmadi</button>
                            </>
                          )}
                          {a.status === "ARRIVED" && (
                            <button disabled={busy} onClick={() => act(a.id, { action: "done" })}
                              className="rounded-lg bg-violet-600 px-3 py-1.5 text-[12.5px] font-bold text-white">Yakunlash</button>
                          )}
                          <span className="ml-auto self-center font-mono text-[11px] text-zinc-400">#{a.code}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Muqobil vaqt */}
      <Sheet open={!!altFor} onClose={() => setAltFor(null)} title="Boshqa vaqt taklif qilish">
        <p className="text-[13.5px] text-zinc-500">{altFor?.patientName} so&apos;ragan vaqt: {altFor && fmtDateTime(altFor.requestedAt)}</p>
        <div className="mt-3 flex gap-2">
          <input type="date" value={altDate} onChange={(e) => setAltDate(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-[14px] outline-none" />
          <TimeInput value={altTime} onChange={setAltTime} step={15} ariaLabel="Muqobil vaqt" />
        </div>
        <button
          disabled={busy || !altDate || !altTime}
          onClick={() => altFor && act(altFor.id, { action: "alt", altAt: `${altDate}T${altTime}:00+05:00` }, () => setAltFor(null))}
          className="mt-3 w-full rounded-2xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40"
        >
          Taklif yuborish
        </button>
      </Sheet>

      {/* Rad etish */}
      <Sheet open={!!rejectFor} onClose={() => setRejectFor(null)} title="So'rovni rad etish">
        <textarea
          value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2}
          placeholder="Sabab (bemorga ko'rsatiladi): masalan, bu kunda joy yo'q"
          className="w-full rounded-xl border border-zinc-200 p-3 text-[14px] outline-none"
        />
        <button
          disabled={busy}
          onClick={() => rejectFor && act(rejectFor.id, { action: "reject", reason: rejectReason }, () => setRejectFor(null))}
          className="mt-3 w-full rounded-2xl bg-red-600 py-3 font-bold text-white disabled:opacity-40"
        >
          Rad etish
        </button>
      </Sheet>

      {toast && <Toast message={toast.msg} error={toast.error} />}
    </div>
  );
}
