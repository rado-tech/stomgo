"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Spinner } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "";

  const [mode, setMode] = useState<"patient" | "staff">("patient");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [via, setVia] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    setError(""); setLoading(true);
    try {
      const res = await api<{ devCode?: string; via?: string; deepLink?: string; botUsername?: string }>("/api/auth/otp", { json: { phone } });
      if (res.devCode) setDevCode(res.devCode);
      setVia(res.via ?? "");
      setDeepLink(res.deepLink ?? "");
      setBotUsername(res.botUsername ?? "");
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError(""); setLoading(true);
    try {
      const res = await api<{ redirect: string }>("/api/auth/verify", { json: { phone, code, name } });
      router.push(next || res.redirect);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  const staffLogin = async () => {
    setError(""); setLoading(true);
    try {
      const res = await api<{ redirect: string }>("/api/auth/login", { json: { username, password } });
      router.push(next || res.redirect);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 pb-20">
      <div className="mb-4 flex justify-end"><ThemeToggle /></div>
      <Link href="/" className="mb-6 flex items-center justify-center gap-2">
        <svg width="40" height="40" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0f766e"/><path d="M256 96c-38 0-52 22-88 22-40 0-72 30-72 76 0 34 12 60 26 88 16 32 22 64 28 106 4 28 10 36 22 36 14 0 20-10 24-34 6-38 14-70 30-70h60c16 0 24 32 30 70 4 24 10 34 24 34 12 0 18-8 22-36 6-42 12-74 28-106 14-28 26-54 26-88 0-46-32-76-72-76-36 0-50-22-88-22z" fill="#fff"/></svg>
        <span className="text-2xl font-extrabold text-teal-800">StomGo</span>
      </Link>

      <div className="mb-5 flex gap-1 rounded-xl bg-zinc-100 p-1">
        <button onClick={() => { setMode("patient"); setError(""); }}
          className={`flex-1 rounded-lg py-2 text-[13.5px] font-semibold ${mode === "patient" ? "bg-white shadow-sm" : "text-zinc-500"}`}>
          Bemor
        </button>
        <button onClick={() => { setMode("staff"); setError(""); }}
          className={`flex-1 rounded-lg py-2 text-[13.5px] font-semibold ${mode === "staff" ? "bg-white shadow-sm" : "text-zinc-500"}`}>
          Klinika / Admin
        </button>
      </div>

      {mode === "staff" ? (
        <>
          <h1 className="text-center text-xl font-bold">Xodimlar kirishi</h1>
          <p className="mt-1 text-center text-[13.5px] text-zinc-500">Login va parolni administratsiya beradi</p>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Login"
            autoCapitalize="none"
            className="mt-5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-teal-500"
            autoFocus
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && staffLogin()}
            placeholder="Parol"
            type="password"
            className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-teal-500"
          />
          {error && <p className="mt-3 text-center text-[13px] text-red-600">{error}</p>}
          <button
            onClick={staffLogin}
            disabled={loading || !username || !password}
            className="mt-4 flex items-center justify-center rounded-2xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40"
          >
            {loading ? <Spinner className="border-white" /> : "Kirish"}
          </button>
        </>
      ) : step === "phone" ? (
        <>
          <h1 className="text-center text-xl font-bold">Kirish yoki ro&apos;yxatdan o&apos;tish</h1>
          <p className="mt-1 text-center text-[13.5px] text-zinc-500">Telefon raqamingizga tasdiqlash kodi yuboriladi</p>
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <span className="font-semibold text-zinc-500">+998</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && requestOtp()}
              placeholder="90 123 45 67"
              inputMode="tel"
              className="w-full text-[16px] outline-none"
              autoFocus
            />
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ismingiz (ixtiyoriy)"
            className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] outline-none"
          />
          {error && <p className="mt-3 text-center text-[13px] text-red-600">{error}</p>}
          <button
            onClick={requestOtp}
            disabled={loading || phone.replace(/\D/g, "").length < 9}
            className="mt-4 flex items-center justify-center rounded-2xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40"
          >
            {loading ? <Spinner className="border-white" /> : "Kod olish"}
          </button>
        </>
      ) : (
        <>
          <h1 className="text-center text-xl font-bold">Kodni kiriting</h1>

          {via === "telegram" && (
            <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2.5 text-center text-[13.5px] text-sky-800">
              ✈️ Kod <b>Telegram botingizga</b> yuborildi{botUsername ? ` (@${botUsername})` : ""}. Botni ochib kodni oling.
            </p>
          )}
          {via === "telegram_link" && (
            <div className="mt-3 rounded-xl bg-sky-50 p-3.5 text-center">
              <p className="text-[13.5px] text-sky-900">
                Raqamingizni <b>Telegram botda tasdiqlang</b> — kirish kodi o&apos;sha yerda beriladi:
              </p>
              <a
                href={deepLink} target="_blank" rel="noreferrer"
                className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-[14px] font-bold text-white"
              >
                ✈️ Botda tasdiqlash
              </a>
              <p className="mt-2 text-[12px] text-sky-700">Botdan kodni olgach, shu yerga qaytib kiriting.</p>
            </div>
          )}
          {via === "sms" && (
            <p className="mt-1 text-center text-[13.5px] text-zinc-500">+998 {phone} raqamiga SMS yuborildi</p>
          )}
          {via === "screen" && devCode && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-[13px] text-amber-800">
              Demo rejim: kod — <b className="font-mono text-[15px]">{devCode}</b>
            </p>
          )}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            placeholder="••••••"
            inputMode="numeric"
            className="mt-5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-teal-500"
            autoFocus
          />
          {error && <p className="mt-3 text-center text-[13px] text-red-600">{error}</p>}
          <button
            onClick={verify}
            disabled={loading || code.length !== 6}
            className="mt-4 flex items-center justify-center rounded-2xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40"
          >
            {loading ? <Spinner className="border-white" /> : "Tasdiqlash"}
          </button>
          <button onClick={() => { setStep("phone"); setCode(""); setDevCode(""); setVia(""); setDeepLink(""); }} className="mt-3 text-center text-[13px] font-medium text-zinc-500">
            Raqamni o&apos;zgartirish
          </button>
        </>
      )}

      <p className="mt-8 text-center text-[11px] text-zinc-400">
        Kirish orqali <Link href="/oferta" className="underline">foydalanish shartlari</Link> va{" "}
        <Link href="/maxfiylik" className="underline">maxfiylik siyosati</Link>ga rozilik bildirasiz.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center"><Spinner /></div>}>
      <LoginForm />
    </Suspense>
  );
}
