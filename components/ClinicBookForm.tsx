"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Slot = { date: string; label: string; slots: string[] };
type Doctor = { id: string; name: string; specialty: string };

/**
 * Klinika xodimi bemorni qabulga yozib qo'yadi.
 * Bemor suhbatda kelishib "yozib qo'ying" desa — shu forma ishlatiladi.
 */
export default function ClinicBookForm({
  slug,
  onDone,
}: {
  slug: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [day, setDay] = useState(0);
  const [time, setTime] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(() => {
    api<{ clinic: { slots: Slot[]; doctors: Doctor[] } }>(`/api/clinics/${slug}`)
      .then((d) => { setSlots(d.clinic.slots); setDoctors(d.clinic.doctors ?? []); })
      .catch(() => setSlots([]));
  }, [slug]);

  useEffect(() => { if (open && !slots) load(); }, [open, slots, load]);

  const reset = () => {
    setPhone(""); setName(""); setNote(""); setDoctorId(""); setTime(""); setDay(0);
  };

  const submit = async () => {
    const d = slots?.[day];
    if (!d) return setMsg({ text: "Kunni tanlang", error: true });
    if (!time) return setMsg({ text: "Vaqtni tanlang", error: true });
    if (phone.replace(/\D/g, "").length < 9) {
      return setMsg({ text: "Telefon raqamni to'liq kiriting", error: true });
    }

    setBusy(true); setMsg(null);
    try {
      const r = await api<{ patient: { name: string | null; phone: string } }>("/api/clinic/book", {
        json: { phone, name, date: d.date, time, note, doctorId },
      });
      setMsg({ text: `${r.patient.name ?? r.patient.phone} ${d.label} ${time} ga yozildi. Bemorga xabar yuborildi.` });
      reset();
      onDone?.();
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-teal-600 px-4 py-2.5 text-[13.5px] font-bold text-white"
      >
        + Bemorni qabulga yozish
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Bemorni qabulga yozish</h3>
        <button onClick={() => { setOpen(false); setMsg(null); }} className="text-[13px] font-semibold text-zinc-500">
          Yopish
        </button>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <label className="text-[12.5px] text-zinc-500">
          Telefon raqam *
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            inputMode="tel"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500"
          />
        </label>
        <label className="text-[12.5px] text-zinc-500">
          Ismi (ixtiyoriy)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bemor ismi"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500"
          />
        </label>
      </div>

      {doctors.length > 0 && (
        <label className="mt-2.5 block text-[12.5px] text-zinc-500">
          Shifokor (ixtiyoriy)
          <select
            value={doctorId} onChange={(e) => setDoctorId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none"
          >
            <option value="">Tanlanmagan</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      )}

      {!slots ? (
        <p className="mt-3 text-[13px] text-zinc-500">Bo&apos;sh vaqtlar yuklanmoqda...</p>
      ) : slots.length === 0 ? (
        <p className="mt-3 text-[13px] text-red-600">
          Bo&apos;sh vaqt topilmadi — Sozlamalardan ish vaqtini tekshiring.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[12.5px] text-zinc-500">Kun</p>
          <div className="sg-noscroll mt-1 flex gap-1.5 overflow-x-auto pb-1">
            {slots.map((d, i) => (
              <button
                key={d.date} onClick={() => { setDay(i); setTime(""); }}
                className={`shrink-0 rounded-xl px-3 py-2 text-[12.5px] font-semibold ${
                  i === day ? "bg-teal-600 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <p className="mt-3 text-[12.5px] text-zinc-500">Vaqt</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(slots[day]?.slots ?? []).map((t) => (
              <button
                key={t} onClick={() => setTime(t)}
                className={`rounded-xl px-3 py-2 text-[12.5px] font-semibold ${
                  t === time ? "bg-teal-600 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
            {(slots[day]?.slots ?? []).length === 0 && (
              <p className="text-[13px] text-zinc-500">Bu kunda bo&apos;sh vaqt yo&apos;q</p>
            )}
          </div>
        </>
      )}

      <label className="mt-3 block text-[12.5px] text-zinc-500">
        Izoh (ixtiyoriy)
        <input
          value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Masalan: chapdagi tish og'riyapti"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500"
        />
      </label>

      {msg && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-[13px] ${msg.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
          {msg.text}
        </p>
      )}

      <button
        onClick={submit} disabled={busy}
        className="mt-3 w-full rounded-xl bg-teal-600 py-2.5 font-bold text-white disabled:opacity-40"
      >
        {busy ? "..." : "Yozib qo'yish"}
      </button>
      <p className="mt-2 text-[11.5px] leading-relaxed text-zinc-500">
        Yozuv darhol tasdiqlangan holatda yaratiladi. Bemorga bildirishnoma va
        (ulangan bo&apos;lsa) Telegram xabari yuboriladi.
      </p>
    </div>
  );
}
