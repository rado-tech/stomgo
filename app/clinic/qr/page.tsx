"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/client";
import { Spinner } from "@/components/ui";

/**
 * Resepshn stoliga qo'yiladigan A4 plakat.
 * Bemor telefon kamerasi bilan skanerlaydi → kelganini o'zi tasdiqlaydi → sharh yozadi.
 * Resepshn hech narsa qilmaydi.
 */
export default function ClinicQrPage() {
  const [data, setData] = useState<{ name: string; qrToken: string | null } | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ clinic: { name: string; qrToken: string | null } }>("/api/clinic/profile")
      .then((d) => setData({ name: d.clinic.name, qrToken: d.clinic.qrToken }))
      .catch(() => setErr("Ma'lumot yuklanmadi"));
  }, []);

  useEffect(() => {
    if (!data?.qrToken) return;
    const url = `${window.location.origin}/checkin/${data.qrToken}`;
    // Chop etishda aniq chiqishi uchun katta o'lchamda va yuqori xatoga chidamlilik bilan
    QRCode.toDataURL(url, { width: 1200, margin: 1, errorCorrectionLevel: "H" })
      .then(setQrUrl)
      .catch(() => setErr("QR kod yaratilmadi"));
  }, [data]);

  if (err) return <p className="py-16 text-center text-[14px] text-red-600">{err}</p>;
  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <>
      {/* Chop etish uchun sozlamalar: A4, tashqi hoshiyalar, faqat plakat chiqadi */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        @media print {
          html,
          body {
            background: #fff !important;
          }
          /* Panel bezaklari, menyu va tugmalar chop etilmasin */
          body * {
            visibility: hidden !important;
          }
          #qr-poster,
          #qr-poster * {
            visibility: visible !important;
          }
          #qr-poster {
            position: absolute;
            inset: 0;
            margin: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-2xl">
        <div className="print:hidden">
          <h1 className="text-xl font-extrabold">Resepshn uchun QR plakat</h1>
          <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-zinc-500">
            Chop eting va resepshn stoliga qo&apos;ying. Bemor kamera bilan skanerlaydi,
            kelganini <b>o&apos;zi</b> tasdiqlaydi va sharh qoldiradi — resepshn vaqti ketmaydi.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-teal-600 px-5 py-2.5 font-bold text-white"
            >
              A4 qilib chop etish
            </button>
            <span className="text-[12.5px] text-zinc-400">
              Chop etish oynasida &laquo;Fon rasmlari / Background graphics&raquo; yoqilgan bo&apos;lsin
            </span>
          </div>
        </div>

        {/* ============ PLAKAT ============ */}
        <div
          id="qr-poster"
          className="mt-5 flex flex-col items-center rounded-3xl border border-zinc-200 bg-white px-10 py-12 text-center print:mt-0"
        >
          {/* Sarlavha: ilova nomi */}
          <div className="flex items-center gap-2.5">
            <svg width="40" height="40" viewBox="0 0 512 512" aria-hidden>
              <rect width="512" height="512" rx="112" fill="#0f766e" />
              <path
                d="M256 96c-38 0-52 22-88 22-40 0-72 30-72 76 0 34 12 60 26 88 16 32 22 64 28 106 4 28 10 36 22 36 14 0 20-10 24-34 6-38 14-70 30-70h60c16 0 24 32 30 70 4 24 10 34 24 34 12 0 18-8 22-36 6-42 12-74 28-106 14-28 26-54 26-88 0-46-32-76-72-76-36 0-50-22-88-22z"
                fill="#fff"
              />
            </svg>
            <span className="text-[34px] font-extrabold leading-none tracking-tight text-teal-800">
              StomGo
            </span>
          </div>

          {/* Klinika nomi */}
          <p className="mt-3 text-[22px] font-bold text-zinc-800">{data.name}</p>

          <div className="mt-7 h-px w-24 bg-zinc-200" />

          {/* Undov */}
          <h2 className="mt-7 text-[40px] font-extrabold leading-tight text-zinc-900">
            Keldingizmi?
          </h2>
          <p className="mt-2 text-[22px] font-bold text-teal-700">
            QR kodni skanerlang
          </p>

          {/* QR */}
          {qrUrl ? (
            <div className="mt-7 rounded-2xl border-4 border-teal-700 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- data-URL QR, next/image optimallashtira olmaydi */}
              <img src={qrUrl} alt="Check-in QR kodi" className="h-[300px] w-[300px]" />
            </div>
          ) : (
            <div className="mt-7 flex h-[332px] w-[332px] items-center justify-center">
              <Spinner />
            </div>
          )}

          {/* Yo'riqnoma */}
          <ol className="mt-8 space-y-2.5 text-left text-[16px] leading-snug text-zinc-700">
            {[
              "Telefon kamerangizni QR kodga qarating",
              "Chiqqan havolani bosing",
              "«Keldim» tugmasini bosing va xizmatni baholang",
            ].map((t, i) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[13px] font-bold text-white">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>

          <p className="mt-8 max-w-md text-[14px] leading-relaxed text-zinc-500">
            Tashrifingizni tasdiqlaganingizdan keyingina sharh yoza olasiz —
            shuning uchun sharhlarimiz haqiqiy bemorlarniki.
          </p>

          <p className="mt-6 text-[13px] text-zinc-400">
            Skanerlay olmasangiz — resepshnga ayting
          </p>
        </div>
      </div>
    </>
  );
}
