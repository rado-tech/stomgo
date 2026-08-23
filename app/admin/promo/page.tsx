"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Badge, Spinner, EmptyState, Toast } from "@/components/ui";
import { fmtDate } from "@/lib/format";

type Slot = {
  id: string; startsAt: string; endsAt: string;
  clinic: { name: string; slug: string };
};
type Data = { slots: Slot[]; clinics: { id: string; name: string }[] };

const kunQoldi = (endsAt: string) =>
  Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400_000));

/** Top joylashuv — pullik ko'rinish. Barcha slotlar teng, pozitsiya yo'q. */
export default function AdminTopPage() {
  const [data, setData] = useState<Data | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [clinicId, setClinicId] = useState("");
  const [days, setDays] = useState(30);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Data>("/api/admin/promo").then(setData).catch(() => setData({ slots: [], clinics: [] }));
  }, []);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const show = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 4000);
  };

  const create = async () => {
    if (!clinicId) return show("Klinikani tanlang", true);
    setBusy(true);
    try {
      await api("/api/admin/promo", { json: { clinicId, days } });
      setClinicId("");
      load();
      show("Top joylashuv berildi");
    } catch (e) {
      show((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: Slot) => {
    if (!confirm(
      `${s.clinic.name} — top joylashuv butunlay o'chiriladi.\n\n` +
      `Ro'yxatdan yo'qoladi, faqat jurnalda iz qoladi.`
    )) return;
    setBusy(true);
    try {
      await api(`/api/admin/promo?id=${s.id}`, { method: "DELETE" });
      load();
      show("O'chirildi");
    } catch (e) {
      show((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.slots ?? []).filter((s) => !t || s.clinic.name.toLowerCase().includes(t));
  }, [data, q]);

  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-extrabold">Top joylashuv</h1>
      <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-zinc-500">
        Pullik ko&apos;rinish: klinika bosh sahifadagi <b>VIP e&apos;lonlar</b> lentasida chiqadi.
        Faqat <b>PRO</b> tarifdagi klinikalarga beriladi. AI tavsiyalariga ta&apos;sir qilmaydi.
      </p>

      {/* Yangi berish */}
      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-2xl border border-teal-200 bg-teal-50/40 p-3.5">
        <label className="text-[12.5px] text-zinc-500">
          Klinika (PRO)
          <select
            value={clinicId} onChange={(e) => setClinicId(e.target.value)}
            className="mt-1 block w-64 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13.5px] text-zinc-900 outline-none"
          >
            <option value="">Tanlang...</option>
            {data.clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-[12.5px] text-zinc-500">
          Muddat (kun)
          <input
            type="number" min={1} max={365} value={days}
            onChange={(e) => setDays(Math.min(365, Math.max(1, parseInt(e.target.value, 10) || 30)))}
            className="mt-1 block w-24 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13.5px] text-zinc-900 outline-none"
          />
        </label>
        <button onClick={create} disabled={busy || !clinicId}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-40">
          Berish
        </button>
        {data.clinics.length === 0 && (
          <p className="w-full text-[12.5px] text-amber-700">
            PRO tarifdagi klinika yo&apos;q. Avval <Link href="/admin/klinikalar" className="underline">Klinikalar</Link> bo&apos;limida tarifni o&apos;zgartiring.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold">Faol joylashuvlar ({shown.length})</h2>
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Klinika nomi"
          className="w-56 rounded-xl border border-zinc-200 px-3.5 py-2 text-[13px] outline-none focus:border-teal-500"
        />
      </div>

      <div className="mt-2 space-y-1.5">
        {shown.length === 0 ? (
          <EmptyState icon="⭐" title="Top joylashuv yo'q" subtitle="Yuqoridan klinika tanlab bering" />
        ) : (
          shown.map((s) => {
            const left = kunQoldi(s.endsAt);
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3.5 py-2.5">
                <Link href={`/klinika/${s.clinic.slug}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                  {s.clinic.name}
                </Link>
                <span className="shrink-0 text-[12.5px] text-zinc-500">
                  {fmtDate(s.startsAt)} – {fmtDate(s.endsAt)}
                </span>
                <Badge color={left > 3 ? "emerald" : left > 0 ? "amber" : "zinc"}>
                  {left > 0 ? `${left} kun` : "tugadi"}
                </Badge>
                <button onClick={() => remove(s)} disabled={busy}
                  className="shrink-0 rounded-lg border border-red-300 px-2.5 py-1.5 text-[12px] font-semibold text-red-600 disabled:opacity-40">
                  O&apos;chirish
                </button>
              </div>
            );
          })
        )}
      </div>

      {toast && <Toast message={toast.msg} error={toast.error} />}
    </div>
  );
}
