"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Badge, Spinner, Toast } from "@/components/ui";

type Slot = { id: string; position: number; startsAt: string; endsAt: string; clinic: { name: string; slug: string }; active?: boolean };

export default function AdminPromoPage() {
  const [data, setData] = useState<{ slots: Slot[]; clinics: { id: string; name: string }[] } | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [clinicId, setClinicId] = useState("");
  const [position, setPosition] = useState(1);
  const [days, setDays] = useState(30);

  const load = useCallback(() => {
    api<{ slots: Slot[]; clinics: { id: string; name: string }[] }>("/api/admin/promo").then((d) => {
      const now = Date.now();
      setData({
        clinics: d.clinics,
        slots: d.slots.map((s) => ({ ...s, active: new Date(s.endsAt).getTime() > now })),
      });
    });
  }, []);
  useEffect(load, [load]);

  const showToast = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 2500);
  };

  const create = async () => {
    try {
      await api("/api/admin/promo", { json: { clinicId, position, days } });
      load(); showToast("Slot yaratildi");
    } catch (e) {
      showToast((e as Error).message, true);
    }
  };

  const end = async (id: string) => {
    await api(`/api/admin/promo?id=${id}`, { method: "DELETE" });
    load(); showToast("Slot tugatildi");
  };

  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-extrabold">Promo slotlar (TOP joylashuv)</h1>
      <p className="mb-4 text-[13px] text-zinc-500">
        Ko&apos;pi bilan 2 ta pozitsiya. Ro&apos;yxat tepasida &quot;Homiylik&quot; belgisi bilan ko&apos;rsatiladi.
        AI triaj tavsiyalariga ta&apos;sir qilmaydi.
      </p>

      <div className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border border-zinc-100 bg-white p-4">
        <label className="text-[12px] font-semibold text-zinc-500">
          Klinika
          <select value={clinicId} onChange={(e) => setClinicId(e.target.value)}
            className="mt-1 block rounded-xl border border-zinc-200 px-3 py-2 text-[13px] font-normal text-zinc-900">
            <option value="">Tanlang...</option>
            {data.clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-semibold text-zinc-500">
          Pozitsiya
          <select value={position} onChange={(e) => setPosition(parseInt(e.target.value, 10))}
            className="mt-1 block rounded-xl border border-zinc-200 px-3 py-2 text-[13px] font-normal text-zinc-900">
            <option value={1}>1</option><option value={2}>2</option>
          </select>
        </label>
        <label className="text-[12px] font-semibold text-zinc-500">
          Muddat (kun)
          <input type="number" value={days} min={1} max={365}
            onChange={(e) => setDays(parseInt(e.target.value, 10) || 30)}
            className="mt-1 block w-24 rounded-xl border border-zinc-200 px-3 py-2 text-[13px] font-normal text-zinc-900" />
        </label>
        <button onClick={create} disabled={!clinicId}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-40">
          Yaratish
        </button>
      </div>

      <div className="space-y-2">
        {data.slots.map((s) => {
          const active = s.active ?? false;
          return (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-3">
              <Badge color={active ? "amber" : "zinc"}>{active ? "Faol" : "Tugagan"}</Badge>
              <span className="font-semibold">{s.clinic.name}</span>
              <span className="text-[13px] text-zinc-500">pozitsiya {s.position}</span>
              <span className="ml-auto text-[12px] text-zinc-400">
                {new Date(s.startsAt).toLocaleDateString("uz-UZ")} – {new Date(s.endsAt).toLocaleDateString("uz-UZ")}
              </span>
              {active && (
                <button onClick={() => end(s.id)} className="rounded-lg border border-red-200 px-3 py-1 text-[12px] font-semibold text-red-600">
                  Tugatish
                </button>
              )}
            </div>
          );
        })}
      </div>
      {toast && <Toast message={toast.msg} error={toast.error} />}
    </div>
  );
}
