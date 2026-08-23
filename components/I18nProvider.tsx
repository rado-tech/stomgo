"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  translator, normalizeLocale, LOCALE_KEY, LOCALE_NAMES, LOCALES,
  type Locale, type TranslationKey,
} from "@/lib/i18n";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

/**
 * Til konteksti.
 *
 * Boshlang'ich qiymat SERVERDA cookie'dan o'qiladi va prop orqali beriladi —
 * shunda birinchi chizishda til to'g'ri bo'ladi va matn miltillamaydi.
 */
export default function I18nProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  const setLocale = useCallback((l: Locale) => {
    const next = normalizeLocale(l);
    setLocaleState(next);
    // Bir yil saqlanadi; server ham shu cookie'ni o'qiydi
    document.cookie = `${LOCALE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<Ctx>(
    () => ({ locale, setLocale, t: translator(locale) }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Matnlarni tarjima qilish uchun */
export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT faqat I18nProvider ichida ishlatiladi");
  return ctx;
}

/** Til tanlagich — ikkita tugma, ochiladigan ro'yxat emas (ikkita til bor) */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useT();
  return (
    <div className={`inline-flex rounded-xl bg-zinc-100 p-0.5 ${className}`} role="group" aria-label="Til">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`rounded-lg px-2.5 py-1 text-[12.5px] font-semibold transition ${
            locale === l ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          {l === "uz" ? "UZ" : "RU"}
        </button>
      ))}
    </div>
  );
}

/** To'liq nomi bilan — sozlamalar sahifasi uchun */
export function LanguageRows() {
  const { locale, setLocale } = useT();
  return (
    <div className="space-y-1.5">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left text-[14px] font-medium transition ${
            locale === l ? "border-teal-600 bg-teal-50 text-teal-800" : "border-zinc-200"
          }`}
        >
          {LOCALE_NAMES[l]}
          {locale === l && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

/** Yozuv holati yorlig'i — tarjima lug'atidan */
export function useStatusLabel() {
  const { t } = useT();
  return (status: string): string => t(`status.${status}` as TranslationKey);
}
