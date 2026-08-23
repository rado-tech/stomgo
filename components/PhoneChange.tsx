"use client";

import { useState } from "react";
import { api } from "@/lib/client";

/**
 * Telefon raqamini almashtirish — ikki bosqichli.
 * Bemor profili, admin va klinika panelida bir xil ishlatiladi.
 */
export default function PhoneChange({
  currentPhone,
  onChanged,
}: {
  currentPhone: string;
  onChanged?: (phone: string) => void;
}) {
  const [step, setStep] = useState<"idle" | "phone" | "code">("idle");
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [via, setVia] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [devCode, setDevCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const say = (text: string, error?: boolean) => {
    setMsg({ text, error });
    if (!error) setTimeout(() => setMsg(null), 5000);
  };

  const request = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ via: string; deepLink?: string; devCode?: string }>("/api/me/phone", {
        json: { newPhone },
      });
      setVia(r.via);
      setDeepLink(r.deepLink ?? "");
      setDevCode(r.devCode ?? "");
      setStep("code");
    } catch (e) {
      say((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true); setMsg(null);
    try {
      await api("/api/me/phone", { method: "PUT", json: { newPhone, code } });
      onChanged?.(newPhone);
      setStep("idle"); setNewPhone(""); setCode("");
      say("Raqam almashtirildi");
    } catch (e) {
      say((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const input =
    "mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500";

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-bold">Telefon raqam</p>
          <p className="mt-0.5 font-mono text-[13.5px] text-zinc-600">{currentPhone}</p>
        </div>
        {step === "idle" && (
          <button onClick={() => setStep("phone")}
            className="shrink-0 rounded-xl border border-zinc-300 px-3.5 py-2 text-[12.5px] font-semibold text-zinc-700">
            Almashtirish
          </button>
        )}
      </div>

      {step === "phone" && (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <label className="block text-[12.5px] text-zinc-500">
            Yangi raqam
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-zinc-200 px-3.5">
              <span className="font-bold text-zinc-500">+998</span>
              <span className="h-5 w-px bg-zinc-200" />
              <input
                value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                placeholder="90 123 45 67" inputMode="tel"
                className="w-full bg-transparent py-2.5 text-[14px] text-zinc-900 outline-none"
              />
            </div>
          </label>
          <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
            Tasdiqlash kodi Telegram botga yuboriladi.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={request} disabled={busy || newPhone.replace(/\D/g, "").length < 9}
              className="flex-1 rounded-xl bg-teal-600 py-2.5 font-bold text-white disabled:opacity-40">
              {busy ? "..." : "Kod olish"}
            </button>
            <button onClick={() => { setStep("idle"); setMsg(null); }}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 font-semibold text-zinc-600">
              Bekor
            </button>
          </div>
        </div>
      )}

      {step === "code" && (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          {via === "telegram_link" && deepLink && (
            <a href={deepLink} target="_blank" rel="noreferrer"
              className="mb-2 block rounded-xl bg-sky-50 px-3 py-2.5 text-center text-[13px] font-semibold text-sky-700">
              Botda yangi raqamni tasdiqlang →
            </a>
          )}
          {via === "screen" && devCode && (
            <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-center text-[13px] text-amber-800">
              Demo rejim: kod — <b className="font-mono">{devCode}</b>
            </p>
          )}
          <input
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••" inputMode="numeric" autoFocus
            className={`${input} text-center font-mono text-2xl tracking-[0.4em]`}
          />
          <div className="mt-3 flex gap-2">
            <button onClick={confirm} disabled={busy || code.length !== 6}
              className="flex-1 rounded-xl bg-teal-600 py-2.5 font-bold text-white disabled:opacity-40">
              {busy ? "..." : "Tasdiqlash"}
            </button>
            <button onClick={() => { setStep("phone"); setCode(""); setMsg(null); }}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 font-semibold text-zinc-600">
              Orqaga
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p className={`mt-2.5 text-[12.5px] ${msg.error ? "text-red-600" : "text-emerald-700"}`}>{msg.text}</p>
      )}
    </div>
  );
}
