"use client";

import { useState } from "react";
import Link from "next/link";
import { api, useGeo } from "@/lib/client";
import { Badge, Spinner, Stars } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import { fmtPrice, fmtKm, SPECIALTY_LABELS } from "@/lib/format";
import { useT } from "@/components/I18nProvider";

type Result = {
  urgency: "EMERGENCY" | "TODAY" | "SOON" | "ROUTINE";
  specialty: string;
  explanation: string;
  priceMin: number; priceMax: number;
  clinics: { slug: string; name: string; district: string; rating: number; reviewCount: number; distanceKm: number; isOpen: boolean; todayHours: string; coverHue: number }[];
};

const PROBLEMS = [
  ["OGRIQ", "🦷", "Tish og'riyapti"],
  ["SHISH", "😖", "Shish / flyus"],
  ["QONASH", "🩸", "Milk qonayapti"],
  ["TRAVMA", "💥", "Tish sindi / travma"],
  ["ESTETIKA", "✨", "Estetika (oqartirish, vinir)"],
  ["PROFILAKTIKA", "🪥", "Profilaktik ko'rik"],
  ["BOSHQA", "❓", "Boshqa"],
] as const;

const PAIN = [
  ["YENGIL", "Yengil — sezilarli, lekin chidasa bo'ladi"],
  ["ORTACHA", "O'rtacha — vaqti-vaqti bilan bezovta qiladi"],
  ["KUCHLI", "Kuchli — doimiy og'riq"],
  ["CHIDAB_BOLMAS", "Chidab bo'lmas — dori ham yordam bermayapti"],
] as const;

const DURATION = [
  ["BUGUN", "Bugun boshlandi"], ["KUNLAR_2_3", "2–3 kun"], ["HAFTA", "Bir haftadan ko'p"], ["OY", "Bir oydan ko'p"],
] as const;

const FLAGS = [
  ["FACE_SWELLING", "Yuz / lunj shishgan"],
  ["FEVER", "Harorat bor"],
  ["SWALLOW", "Yutish qiyin"],
  ["BREATH", "Nafas olish qiyin"],
  ["BLEEDING_NONSTOP", "Qon to'xtamayapti"],
  ["NIGHT_PAIN", "Tunda uyg'otadi"],
  ["SENSITIVITY", "Sovuq-issiqqa sezgir"],
  ["GUM_BLEED", "Milk qonashi"],
] as const;

const URGENCY_UI = {
  EMERGENCY: { color: "bg-red-600", label: "Shoshilinch holat", text: "text-red-700", light: "bg-red-50 border-red-200" },
  TODAY: { color: "bg-orange-500", label: "Bugun ko'rining", text: "text-orange-700", light: "bg-orange-50 border-orange-200" },
  SOON: { color: "bg-amber-500", label: "3–5 kun ichida ko'rining", text: "text-amber-700", light: "bg-amber-50 border-amber-200" },
  ROUTINE: { color: "bg-emerald-600", label: "Rejali ko'rik yetarli", text: "text-emerald-700", light: "bg-emerald-50 border-emerald-200" },
};

export default function TriagePage() {
  const { t } = useT();
  const geo = useGeo();
  const [step, setStep] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [painLevel, setPainLevel] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [flags, setFlags] = useState<string[]>([]);
  const [isChild, setIsChild] = useState<boolean | null>(null);
  const [freeText, setFreeText] = useState("");
  const [mode, setMode] = useState<"wizard" | "text">("wizard");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const needsPain = problem === "OGRIQ" || problem === "SHISH";
  const steps = needsPain ? 4 : 3; // problem → (pain) → duration/flags → child

  const submit = async (payload: { answers?: object; freeText?: string }) => {
    setLoading(true);
    try {
      const res = await api<Result>("/api/triage", { json: { ...payload, lat: geo.lat, lng: geo.lng } });
      setResult(res);
    } catch {
      // xatolikda ham bo'sh natija ko'rsatmaymiz
    } finally {
      setLoading(false);
    }
  };

  const submitWizard = () =>
    submit({ answers: { problem, painLevel, duration, flags, isChild: isChild === true } });

  const reset = () => {
    setStep(0); setProblem(null); setPainLevel(null); setDuration(null);
    setFlags([]); setIsChild(null); setResult(null); setFreeText("");
  };

  if (result) {
    const ui = URGENCY_UI[result.urgency];
    return (
      <>
      <TopNav />
      <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24 pt-6 md:max-w-2xl md:pb-12 md:pt-8">
        <div className={`rounded-2xl border p-4 ${ui.light}`}>
          <span className={`inline-block rounded-full px-3 py-1 text-[13px] font-bold text-white ${ui.color}`}>{ui.label}</span>
          {result.urgency === "EMERGENCY" ? (
            <>
              <p className="mt-3 text-[14.5px] font-semibold leading-relaxed">{result.explanation}</p>
              <a href="tel:103" className="mt-4 block rounded-2xl bg-red-600 py-3.5 text-center text-lg font-bold text-white">
                📞 103 — Tez yordam
              </a>
            </>
          ) : (
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-700">{result.explanation}</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-zinc-100 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase text-zinc-400">Mutaxassis</p>
            <p className="mt-1 text-[13.5px] font-bold">{SPECIALTY_LABELS[result.specialty] ?? result.specialty}</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase text-zinc-400">Taxminiy narx</p>
            <p className="mt-1 text-[13.5px] font-bold text-teal-700">
              {result.priceMin ? `${fmtPrice(result.priceMin)} – ${fmtPrice(result.priceMax)} so'm` : "—"}
            </p>
          </div>
        </div>

        {result.clinics.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 font-bold">{result.urgency === "EMERGENCY" || result.urgency === "TODAY" ? t("triage.nearbyOpen") : t("triage.matching")}</h2>
            <div className="space-y-2">
              {result.clinics.map((c) => (
                <Link key={c.slug} href={`/klinika/${c.slug}`} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ background: `hsl(${c.coverHue} 55% 45%)` }}>{c.name[0]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{c.name}</p>
                    <div className="flex items-center gap-1.5 text-[12px] text-zinc-500">
                      <Stars value={c.rating} size={11} /> {c.rating.toFixed(1)} · {c.district} · {fmtKm(c.distanceKm)}
                    </div>
                  </div>
                  {c.isOpen ? <Badge color="emerald">Ochiq</Badge> : <Badge color="zinc">Yopiq</Badge>}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-xl bg-zinc-100 p-3 text-[12px] leading-relaxed text-zinc-500">
          ⚠️ Bu tibbiy tashxis emas — faqat yo&apos;naltiruvchi taxmin. Aniq tashxis uchun shifokor ko&apos;rigi shart.
          Tavsiyalarga homiylik yoki reklama ta&apos;sir qilmaydi.
        </div>

        <button onClick={reset} className="mt-4 w-full rounded-2xl border border-zinc-300 py-3 font-semibold text-zinc-600">
          Qaytadan boshlash
        </button>
        <BottomNav />
      </div>
      </>
    );
  }

  return (
    <>
    <TopNav />
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24 pt-6 md:max-w-2xl md:pb-12 md:pt-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("triage.title")}</h1>
        <span className="md:hidden"><ThemeToggle /></span>
      </div>
      <p className="mt-1 text-[13.5px] text-zinc-500">
        Savollarga javob bering — qanchalik shoshilinch ekanini, qaysi mutaxassis kerakligini va taxminiy narxni aytamiz.
      </p>

      <div className="mt-4 flex gap-1 rounded-xl bg-zinc-100 p-1">
        <button onClick={() => setMode("wizard")} className={`flex-1 rounded-lg py-2 text-[13px] font-semibold ${mode === "wizard" ? "bg-white shadow-sm" : "text-zinc-500"}`}>Savollar</button>
        <button onClick={() => setMode("text")} className={`flex-1 rounded-lg py-2 text-[13px] font-semibold ${mode === "text" ? "bg-white shadow-sm" : "text-zinc-500"}`}>O&apos;zim yozaman</button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-16">
          <Spinner />
          <p className="mt-3 text-[13px] text-zinc-500">Tahlil qilinmoqda...</p>
        </div>
      ) : mode === "text" ? (
        <div className="mt-4">
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={5}
            placeholder="Masalan: pastki jag'imdagi tish 3 kundan beri og'riyapti, kechasi uxlolmayapman, sovuq suvdan battar bo'ladi..."
            className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-[14.5px] outline-none focus:border-teal-500"
          />
          <button
            onClick={() => submit({ freeText })}
            disabled={freeText.trim().length < 10}
            className="mt-3 w-full rounded-2xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40"
          >
            Tahlil qilish
          </button>
        </div>
      ) : (
        <div className="mt-4">
          {/* Bosqich indikatori */}
          <div className="mb-4 flex gap-1">
            {Array.from({ length: steps + 1 }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-teal-600" : "bg-zinc-200"}`} />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-2">
              <p className="font-semibold">Nima bezovta qilyapti?</p>
              {PROBLEMS.map(([code, emoji, label]) => (
                <button key={code} onClick={() => { setProblem(code); setStep(1); }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 text-left text-[14.5px] font-medium hover:border-teal-400">
                  <span className="text-xl">{emoji}</span> {label}
                </button>
              ))}
            </div>
          )}

          {step === 1 && needsPain && (
            <div className="space-y-2">
              <p className="font-semibold">Og&apos;riq qanchalik kuchli?</p>
              {PAIN.map(([code, label]) => (
                <button key={code} onClick={() => { setPainLevel(code); setStep(2); }}
                  className="block w-full rounded-2xl border border-zinc-200 bg-white p-3.5 text-left text-[14px] font-medium hover:border-teal-400">
                  {label}
                </button>
              ))}
            </div>
          )}

          {((step === 1 && !needsPain) || (step === 2 && needsPain)) && (
            <div className="space-y-2">
              <p className="font-semibold">Qachondan beri?</p>
              {DURATION.map(([code, label]) => (
                <button key={code} onClick={() => { setDuration(code); setStep(needsPain ? 3 : 2); }}
                  className="block w-full rounded-2xl border border-zinc-200 bg-white p-3.5 text-left text-[14px] font-medium hover:border-teal-400">
                  {label}
                </button>
              ))}
            </div>
          )}

          {((step === 2 && !needsPain) || (step === 3 && needsPain)) && (
            <div>
              <p className="font-semibold">Qo&apos;shimcha belgilar bormi?</p>
              <p className="text-[12.5px] text-zinc-500">Bir nechtasini tanlash mumkin</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FLAGS.map(([code, label]) => (
                  <button key={code}
                    onClick={() => setFlags((f) => f.includes(code) ? f.filter((x) => x !== code) : [...f, code])}
                    className={`rounded-full border px-3 py-2 text-[13px] font-medium ${flags.includes(code) ? "border-teal-600 bg-teal-50 text-teal-800" : "border-zinc-200 bg-white"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(needsPain ? 4 : 3)} className="mt-4 w-full rounded-2xl bg-teal-600 py-3 font-bold text-white">
                Davom etish
              </button>
            </div>
          )}

          {((step === 3 && !needsPain) || (step === 4 && needsPain)) && (
            <div className="space-y-2">
              <p className="font-semibold">Kim uchun?</p>
              <button onClick={() => { setIsChild(false); }} className={`block w-full rounded-2xl border p-3.5 text-left text-[14px] font-medium ${isChild === false ? "border-teal-600 bg-teal-50" : "border-zinc-200 bg-white"}`}>
                O&apos;zim uchun (katta yoshli)
              </button>
              <button onClick={() => { setIsChild(true); }} className={`block w-full rounded-2xl border p-3.5 text-left text-[14px] font-medium ${isChild === true ? "border-teal-600 bg-teal-50" : "border-zinc-200 bg-white"}`}>
                Bola uchun
              </button>
              <button
                onClick={submitWizard}
                disabled={isChild === null}
                className="mt-2 w-full rounded-2xl bg-teal-600 py-3.5 font-bold text-white disabled:opacity-40"
              >
                Natijani ko&apos;rish
              </button>
            </div>
          )}

          {step > 0 && (
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="mt-3 text-[13px] font-medium text-zinc-500">
              ← Orqaga
            </button>
          )}
        </div>
      )}

      <BottomNav />
    </div>
    </>
  );
}
