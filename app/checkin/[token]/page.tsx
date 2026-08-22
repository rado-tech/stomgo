"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, useUser } from "@/lib/client";
import { Cover, Spinner } from "@/components/ui";

type ClinicInfo = { name: string; address: string; photoUrl: string | null; coverHue: number };

/**
 * Klinikadagi QR kod skanerlanganda ochiladigan sahifa.
 * Oqim: klinika ko'rsatiladi → (kerak bo'lsa tezkor kirish) → kelganini tasdiqlash → sharh.
 * Resepshn ishtirok etmaydi — navbat sekinlashmaydi.
 */
export default function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { user, loading: userLoading, setUser } = useUser();

  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"info" | "done" | "review" | "thanks">("info");
  const [busy, setBusy] = useState(false);
  const [aptId, setAptId] = useState("");

  // Tezkor kirish
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [via, setVia] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [loginStep, setLoginStep] = useState<"phone" | "code">("phone");
  const [loginError, setLoginError] = useState("");

  // Sharh
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => {
    api<{ clinic: ClinicInfo }>(`/api/checkin?token=${encodeURIComponent(token)}`)
      .then((d) => setClinic(d.clinic))
      .catch((e) => setError((e as Error).message));
  }, [token]);

  const doCheckin = async () => {
    setBusy(true);
    try {
      const res = await api<{ clinicName: string; appointmentId: string; canReview: boolean }>("/api/checkin", { json: { token } });
      setAptId(res.appointmentId);
      setPhase(res.canReview ? "review" : "done");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const requestOtp = async () => {
    setLoginError(""); setBusy(true);
    try {
      const res = await api<{ devCode?: string; via?: string; deepLink?: string }>("/api/auth/otp", { json: { phone } });
      if (res.devCode) setDevCode(res.devCode);
      setVia(res.via ?? "");
      setDeepLink(res.deepLink ?? "");
      setLoginStep("code");
    } catch (e) {
      setLoginError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setLoginError(""); setBusy(true);
    try {
      const res = await api<{ user: { id: string; name: string | null; phone: string; role: string } }>("/api/auth/verify", { json: { phone, code, name } });
      setUser(res.user as Parameters<typeof setUser>[0]);
      setBusy(false);
      await doCheckin();
    } catch (e) {
      setLoginError((e as Error).message);
      setBusy(false);
    }
  };

  const submitReview = async () => {
    setBusy(true);
    try {
      await api("/api/reviews", { json: { appointmentId: aptId, rating, text: reviewText } });
      setPhase("thanks");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !clinic) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-4xl">😕</p>
        <p className="font-bold">{error}</p>
        <Link href="/" className="mt-2 rounded-2xl bg-teal-600 px-6 py-3 font-bold text-white">Bosh sahifa</Link>
      </div>
    );
  }
  if (!clinic || userLoading) {
    return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      {/* Klinika sarlavhasi */}
      <div className="flex items-center gap-3">
        <Cover hue={clinic.coverHue} name={clinic.name} photoUrl={clinic.photoUrl} className="h-14 w-14 rounded-2xl text-xl" />
        <div>
          <h1 className="text-lg font-extrabold">{clinic.name}</h1>
          <p className="text-[13px] text-zinc-500">{clinic.address}</p>
        </div>
      </div>

      {phase === "info" && (
        <>
          {!user ? (
            /* Tezkor kirish — check-in uchun */
            <div className="mt-6">
              <p className="font-bold">Kelganingizni tasdiqlash uchun kiring</p>
              {loginStep === "phone" ? (
                <>
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <span className="font-semibold text-zinc-500">+998</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                      placeholder="90 123 45 67" inputMode="tel" autoFocus
                      className="w-full text-[16px] outline-none" />
                  </div>
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Ismingiz (ixtiyoriy)"
                    className="mt-2.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] outline-none" />
                  {loginError && <p className="mt-2 text-[13px] text-red-600">{loginError}</p>}
                  <button onClick={requestOtp} disabled={busy || phone.replace(/\D/g, "").length < 9}
                    className="mt-3 w-full rounded-2xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40">
                    {busy ? "..." : "Kod olish"}
                  </button>
                </>
              ) : (
                <>
                  {via === "telegram" && (
                    <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-center text-[13px] text-sky-800">
                      ✈️ Kod Telegram botingizga yuborildi
                    </p>
                  )}
                  {via === "telegram_link" && (
                    <div className="mt-3 rounded-xl bg-sky-50 p-3 text-center">
                      <a href={deepLink} target="_blank" rel="noreferrer"
                        className="inline-block rounded-xl bg-sky-500 px-5 py-2.5 text-[13.5px] font-bold text-white">
                        ✈️ Botda raqamni tasdiqlash
                      </a>
                      <p className="mt-1.5 text-[12px] text-sky-700">Kod botda beriladi — qaytib shu yerga kiriting</p>
                    </div>
                  )}
                  {via === "screen" && devCode && (
                    <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-[13px] text-amber-800">
                      Demo rejim: kod — <b className="font-mono text-[15px]">{devCode}</b>
                    </p>
                  )}
                  <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && verify()}
                    placeholder="••••••" inputMode="numeric" autoFocus
                    className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none" />
                  {loginError && <p className="mt-2 text-[13px] text-red-600">{loginError}</p>}
                  <button onClick={verify} disabled={busy || code.length !== 6}
                    className="mt-3 w-full rounded-2xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40">
                    {busy ? "..." : "Tasdiqlash va kelganimni belgilash"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <div className="rounded-2xl bg-teal-50 p-4 text-[14px] text-teal-900">
                <b>{user.name ?? user.phone}</b>, klinikaga xush kelibsiz!
                Kelganingizni tasdiqlasangiz — tashrifingiz qayd etiladi va keyin sharh yoza olasiz.
              </div>
              {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
              <button onClick={doCheckin} disabled={busy}
                className="mt-4 w-full rounded-2xl bg-teal-600 py-4 text-[16px] font-bold text-white disabled:opacity-40">
                {busy ? "..." : "✓ Keldim — tasdiqlash"}
              </button>
            </div>
          )}
        </>
      )}

      {phase === "review" && (
        <div className="mt-6">
          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
            <p className="text-3xl">✅</p>
            <p className="mt-1 font-bold text-emerald-800">Tashrifingiz qayd etildi!</p>
          </div>
          <p className="mt-5 text-center font-bold">Xizmatni baholang</p>
          <p className="text-center text-[13px] text-zinc-500">Fikringiz boshqa bemorlarga yordam beradi</p>
          <div className="mt-3 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => setRating(i)} className="text-4xl">
                {i <= rating ? "★" : "☆"}
              </button>
            ))}
          </div>
          <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3}
            placeholder="Xizmat qanday bo'ldi? (ixtiyoriy)"
            className="mt-4 w-full rounded-2xl border border-zinc-200 bg-white p-3 text-[14px] outline-none" />
          <button onClick={submitReview} disabled={busy || rating === 0}
            className="mt-3 w-full rounded-2xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40">
            Yuborish
          </button>
          <button onClick={() => setPhase("thanks")} className="mt-2 w-full py-2 text-[13px] font-medium text-zinc-500">
            Keyinroq baholayman
          </button>
        </div>
      )}

      {(phase === "done" || phase === "thanks") && (
        <div className="mt-10 text-center">
          <p className="text-5xl">🦷</p>
          <p className="mt-3 text-lg font-extrabold">Rahmat!</p>
          <p className="mt-1 text-[14px] text-zinc-500">
            {phase === "thanks" && rating > 0
              ? "Sharhingiz moderatsiyadan so'ng e'lon qilinadi."
              : "Tashrifingiz qayd etildi. Sog' bo'ling!"}
          </p>
          <Link href="/" className="mt-5 inline-block rounded-2xl bg-teal-600 px-8 py-3 font-bold text-white">
            Bosh sahifa
          </Link>
        </div>
      )}
    </div>
  );
}
