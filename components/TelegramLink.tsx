"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Badge } from "./ui";

type LinkInfo = {
  configured: boolean;
  botUsername: string;
  code: string;
  linked: boolean;
  deepLink: string | null;
};

/** Telegram botga ulash bo'limi — bemor profili va klinika sozlamalarida ishlatiladi */
export default function TelegramLink({ variant }: { variant: "patient" | "clinic" }) {
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<LinkInfo>("/api/telegram/link").then(setInfo).catch(() => {});
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 15_000); // ulanish holatini kuzatish
    return () => clearInterval(t);
  }, [load]);

  if (!info) return null;

  const unlink = async () => {
    setBusy(true);
    try {
      await api("/api/telegram/link", { method: "DELETE" });
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Telegram bildirishnomalar</h2>
        {info.linked ? <Badge color="emerald">Ulangan ✓</Badge> : <Badge color="zinc">Ulanmagan</Badge>}
      </div>

      {!info.configured ? (
        <p className="mt-2 text-[13px] text-zinc-500">
          Bot hali sozlanmagan (TELEGRAM_BOT_TOKEN berilmagan). Sozlangach bu yerda ulash havolasi chiqadi.
        </p>
      ) : info.linked ? (
        <div className="mt-2">
          <p className="text-[13.5px] text-zinc-600">
            {variant === "clinic"
              ? "Yangi yozuv so'rovlari Telegram chatingizga tushadi — tugmalar orqali tasdiqlaysiz."
              : "Yozuv tasdiqlanganda va qabuldan 24 soat / 2 soat oldin eslatma keladi."}
          </p>
          <button onClick={unlink} disabled={busy} className="mt-2 text-[13px] font-semibold text-red-600">
            Ulanishni uzish
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-[13.5px] text-zinc-600">
            {variant === "clinic"
              ? "Ulang — yangi so'rovlar Telegramga tushadi va bir tugma bilan tasdiqlanadi. Botni xodimlar guruhiga qo'shsangiz ham bo'ladi."
              : "Ulang — tasdiqlash xabarlari va qabul eslatmalari Telegramga keladi."}
          </p>
          {info.deepLink ? (
            <a
              href={info.deepLink} target="_blank" rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-[13.5px] font-bold text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9.04 15.9l-.38 5.37c.54 0 .78-.23 1.06-.5l2.55-2.44 5.28 3.87c.97.53 1.65.25 1.91-.9L22.9 3.8c.31-1.43-.52-1.99-1.46-1.64L2.6 9.42c-1.4.54-1.38 1.32-.24 1.67l4.82 1.5L18.36 5.6c.53-.35 1.01-.16.62.19L9.04 15.9z"/></svg>
              Telegram&apos;da ulash
            </a>
          ) : (
            <p className="mt-2 rounded-xl bg-zinc-50 p-3 text-[13px]">
              Botga kirib shu kodni yuboring: <b className="font-mono">{info.code}</b>
            </p>
          )}
          <p className="mt-2 text-[12px] text-zinc-400">Ulangach bu sahifa bir necha soniyada yangilanadi.</p>
        </div>
      )}
    </section>
  );
}
