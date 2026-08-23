"use client";

import { useState } from "react";
import { api } from "@/lib/client";

/**
 * Klinika/admin parolini tiklash.
 * Kod hisobga ulangan Telegram chatiga boradi — boshqa yo'l yo'q.
 */
export default function PasswordReset({
  initialUsername,
  onDone,
  onCancel,
}: {
  initialUsername?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"ask" | "code">("ask");
  const [username, setUsername] = useState(initialUsername ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const input =
    "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-teal-500";

  const request = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ message: string }>("/api/auth/reset", { json: { username } });
      setStep("code");
      setMsg({ text: r.message });
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (password !== password2) return setMsg({ text: "Parollar mos kelmadi", error: true });
    if (password.length < 10) return setMsg({ text: "Parol kamida 10 belgi bo'lsin", error: true });
    setBusy(true); setMsg(null);
    try {
      await api("/api/auth/reset", { method: "PUT", json: { username, code, password } });
      onDone();
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="text-center text-xl font-bold">Parolni tiklash</h1>
      <p className="mt-1 text-center text-[13.5px] leading-relaxed text-zinc-500">
        Tasdiqlash kodi hisobingizga ulangan Telegram botga yuboriladi.
      </p>

      {step === "ask" ? (
        <>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            onKeyDown={(e) => e.key === "Enter" && username && request()}
            placeholder="Login"
            autoCapitalize="none"
            autoFocus
            className={`mt-5 ${input}`}
          />
          <button
            onClick={request}
            disabled={busy || !username.trim()}
            className="mt-4 w-full rounded-2xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40"
          >
            {busy ? "..." : "Kod yuborish"}
          </button>
        </>
      ) : (
        <>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            inputMode="numeric"
            autoFocus
            className={`mt-5 ${input} text-center font-mono text-2xl tracking-[0.4em]`}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Yangi parol (kamida 10 belgi)"
            type="password"
            autoComplete="new-password"
            className={`mt-3 ${input}`}
          />
          <input
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Yangi parolni takrorlang"
            type="password"
            autoComplete="new-password"
            className={`mt-3 ${input}`}
          />
          <button
            onClick={submit}
            disabled={busy || code.length !== 6 || !password}
            className="mt-4 w-full rounded-2xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40"
          >
            {busy ? "..." : "Parolni saqlash"}
          </button>
        </>
      )}

      {msg && (
        <p className={`mt-3 text-center text-[13px] leading-relaxed ${msg.error ? "text-red-600" : "text-zinc-500"}`}>
          {msg.text}
        </p>
      )}

      <button onClick={onCancel} className="mt-4 w-full py-2 text-center text-[13px] font-semibold text-zinc-500">
        Kirishga qaytish
      </button>

      <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-center text-[12px] leading-relaxed text-zinc-500">
        Telegram botga ulanmagan bo&apos;lsangiz, parolni faqat administrator
        tiklay oladi — u bilan bog&apos;laning.
      </p>
    </>
  );
}
