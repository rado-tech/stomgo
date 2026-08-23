"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

const CONFIRM_WORD = "O'CHIRISH";

/**
 * Hisobni o'chirish — Google Play talabi va foydalanuvchining haqqi.
 * Shaxsiy ma'lumot tozalanadi, tashrif tarixi klinika statistikasi uchun
 * anonim qoladi. Nima o'chib nima qolishi ochiq yozilgan.
 */
export default function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    setBusy(true); setError("");
    try {
      await api("/api/me", { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-red-200 px-3 py-2.5 text-[13px] font-semibold text-red-600 transition hover:bg-red-50"
      >
        Hisobni o&apos;chirish
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
      <p className="text-[14px] font-bold text-red-800">Hisobni o&apos;chirish</p>

      <div className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-zinc-700">
        <p>
          <b>O&apos;chadi:</b> ismingiz, tug&apos;ilgan yilingiz, rasmingiz,
          Telegram ulanishi, barcha suhbatlar va ulardagi rasmlar,
          bildirishnomalar.
        </p>
        <p>
          <b>Anonim qoladi:</b> qabul yozuvlari va sharhlaringiz — klinikalar
          o&apos;z statistikasini yo&apos;qotmasligi uchun. Ularda ismingiz
          ko&apos;rinmaydi.
        </p>
        <p className="text-zinc-500">
          Raqamingiz bo&apos;shatiladi — o&apos;sha raqam bilan qaytadan
          ro&apos;yxatdan o&apos;tsangiz, bu yangi hisob bo&apos;ladi va eski
          tarix unga bog&apos;lanmaydi.
        </p>
      </div>

      <label className="mt-3 block text-[12.5px] text-zinc-600">
        Tasdiqlash uchun <b className="font-mono text-red-700">{CONFIRM_WORD}</b> deb yozing
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoFocus
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-red-500"
        />
      </label>

      {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={remove}
          disabled={busy || typed.trim() !== CONFIRM_WORD}
          className="flex-1 rounded-xl bg-red-600 py-2.5 font-bold text-white disabled:opacity-40"
        >
          {busy ? "..." : "Hisobni o'chirish"}
        </button>
        <button
          onClick={() => { setOpen(false); setTyped(""); setError(""); }}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 font-semibold text-zinc-600"
        >
          Bekor
        </button>
      </div>
    </div>
  );
}
