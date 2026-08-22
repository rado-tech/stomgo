"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/client";
import { Spinner } from "@/components/ui";

/**
 * Resepshn stoliga qo'yiladigan QR kod.
 * Bemor telefon kamerasi bilan skanerlaydi → kelganini o'zi tasdiqlaydi → sharh yozadi.
 * Resepshn hech narsa qilmaydi.
 */
export default function ClinicQrPage() {
  const [data, setData] = useState<{ name: string; qrToken: string | null } | null>(null);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    api<{ clinic: { name: string; qrToken: string | null } }>("/api/clinic/profile").then((d) => {
      setData({ name: d.clinic.name, qrToken: d.clinic.qrToken });
    });
  }, []);

  useEffect(() => {
    if (data?.qrToken) {
      const url = `${window.location.origin}/checkin/${data.qrToken}`;
      QRCode.toDataURL(url, { width: 480, margin: 2 }).then(setQrUrl);
    }
  }, [data]);

  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-lg">
      <div className="print:hidden">
        <h1 className="text-xl font-extrabold">Check-in QR kodi</h1>
        <p className="mt-1 text-[13.5px] text-zinc-500">
          Chop etib resepshn stoliga qo&apos;ying. Bemor kamera bilan skanerlaydi,
          kelganini <b>o&apos;zi</b> tasdiqlaydi va sharh qoldiradi — resepshn vaqti ketmaydi.
        </p>
        <button
          onClick={() => window.print()}
          className="mt-3 rounded-xl bg-teal-600 px-5 py-2.5 font-bold text-white"
        >
          🖨 Chop etish
        </button>
      </div>

      {/* Chop etiladigan varaq */}
      <div className="mt-5 rounded-3xl border-2 border-zinc-200 bg-white p-8 text-center print:mt-0 print:rounded-none print:border-0">
        <p className="text-2xl font-extrabold text-teal-800">🦷 StomGo</p>
        <p className="mt-1 text-lg font-bold">{data.name}</p>
        <p className="mt-4 text-[17px] font-bold">Keldingizmi? Skanerlang! 📱</p>
        <p className="mt-1 text-[13px] text-zinc-500">
          Telefon kamerasini QR kodga qarating —<br />kelganingizni tasdiqlang va xizmatni baholang
        </p>
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data-URL QR
          <img src={qrUrl} alt="Check-in QR" className="mx-auto mt-4 w-72 max-w-full" />
        ) : (
          <div className="mx-auto mt-4 flex h-72 w-72 items-center justify-center"><Spinner /></div>
        )}
        <p className="mt-3 text-[12px] text-zinc-400">Skaner ishlamasa, resepshndan so&apos;rang</p>
      </div>
    </div>
  );
}
