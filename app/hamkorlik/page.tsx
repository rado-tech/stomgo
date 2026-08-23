"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { DISTRICTS } from "@/lib/districts";
import BackButton from "@/components/BackButton";

const EMPTY = {
  clinicName: "", district: "", address: "", phone: "",
  contactName: "", telegram: "", doctorCount: "", note: "",
};

/** Klinika hamkorlik arizasi — kirish talab qilinmaydi */
export default function PartnershipPage() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true); setError("");
    try {
      await api("/api/hamkorlik", { json: form });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input =
    "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14.5px] text-zinc-900 outline-none focus:border-teal-500";
  const label = "block text-[13px] font-medium text-zinc-600";

  if (sent) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="text-5xl">🤝</p>
        <h1 className="mt-3 text-xl font-extrabold">Ariza qabul qilindi</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">
          Bir ish kuni ichida ko&apos;rsatilgan raqamga bog&apos;lanamiz.
          Suhbatdan keyin sizga panelga kirish uchun login va parol beriladi.
        </p>
        <Link href="/" className="mt-6 rounded-2xl bg-teal-600 px-6 py-3 font-bold text-white">
          Bosh sahifaga
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-5 md:py-8">
      <div className="flex items-center gap-3">
        <BackButton href="/" />
        <h1 className="text-xl font-extrabold md:text-2xl">Klinikangizni StomGo&apos;ga qo&apos;shing</h1>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Bemor o'zi topadi", "Xaritada, narx bo'yicha va tumaningiz bo'yicha qidiruvda ko'rinasiz"],
          ["Yozuvlar bir joyda", "Qabullar, suhbatlar va sharhlar — bitta panelda"],
          ["Boshlash bepul", "Ulanish uchun to'lov yo'q"],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-zinc-100 bg-white p-3.5">
            <p className="text-[13.5px] font-bold">{t}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3 rounded-2xl border border-zinc-100 bg-white p-4">
        <label className={label}>
          Klinika nomi *
          <input value={form.clinicName} onChange={set("clinicName")} placeholder="Masalan: ProDent" className={input} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Tuman *
            <select value={form.district} onChange={set("district")} className={input}>
              <option value="">Tanlang</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className={label}>
            Shifokorlar soni
            <input
              value={form.doctorCount}
              onChange={(e) => setForm((f) => ({ ...f, doctorCount: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
              inputMode="numeric" placeholder="5" className={input}
            />
          </label>
        </div>

        <label className={label}>
          Manzil
          <input value={form.address} onChange={set("address")} placeholder="Ko'cha, uy" className={input} />
        </label>

        <div className="border-t border-zinc-100 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Bog&apos;lanish uchun ism *
              <input value={form.contactName} onChange={set("contactName")} placeholder="Ism Familiya" className={input} />
            </label>
            <label className={label}>
              Telefon *
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 focus-within:border-teal-500">
                <span className="text-[14px] font-semibold text-zinc-500">+998</span>
                <span className="h-5 w-px bg-zinc-200" />
                <input
                  value={form.phone} onChange={set("phone")}
                  placeholder="90 123 45 67" inputMode="tel"
                  className="w-full bg-transparent py-2.5 text-[14.5px] text-zinc-900 outline-none"
                />
              </div>
            </label>
          </div>

          <label className={`${label} mt-3`}>
            Telegram (ixtiyoriy)
            <input value={form.telegram} onChange={set("telegram")} placeholder="@username" className={input} />
          </label>
        </div>

        <label className={label}>
          Qo&apos;shimcha
          <textarea
            value={form.note} onChange={set("note")} rows={3}
            placeholder="Ish vaqti, mutaxassisliklar yoki savolingiz"
            className={`${input} resize-none`}
          />
        </label>

        {error && <p className="text-[13px] text-red-600">{error}</p>}

        <button
          onClick={submit}
          disabled={busy || !form.clinicName.trim() || !form.district || !form.contactName.trim() || !form.phone.trim()}
          className="w-full rounded-2xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40"
        >
          {busy ? "Yuborilmoqda..." : "Ariza yuborish"}
        </button>

        <p className="text-center text-[12px] leading-relaxed text-zinc-400">
          Ariza yuborish orqali <Link href="/oferta" className="underline">shartnoma shartlari</Link> va{" "}
          <Link href="/maxfiylik" className="underline">maxfiylik siyosati</Link>ga rozilik bildirasiz.
        </p>
      </div>
    </main>
  );
}
