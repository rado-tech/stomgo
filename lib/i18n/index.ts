import { uz, type TranslationKey } from "./uz";
import { ru } from "./ru";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./types";

export * from "./types";
export type { TranslationKey };

const DICTS: Record<Locale, Record<TranslationKey, string>> = { uz, ru };

/**
 * Tarjima qiluvchi funksiya.
 * Kalit topilmasa o'zbekchaga, u ham bo'lmasa kalitning o'ziga qaytadi —
 * hech qachon bo'sh joy ko'rinmaydi.
 */
export function translator(locale: Locale) {
  const dict = DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
  return function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let s: string = dict[key] ?? uz[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    }
    return s;
  };
}

/** Brauzer tilidan taxmin qilish — foydalanuvchi hali tanlamagan bo'lsa */
export function guessLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const first = acceptLanguage.toLowerCase();
  // Ruscha yoki qardosh kirill tillari -> ruscha ko'rsatamiz
  if (/\b(ru|kk|ky|tg)\b/.test(first)) return "ru";
  return DEFAULT_LOCALE;
}

export function normalizeLocale(v: unknown): Locale {
  return isLocale(v) ? v : DEFAULT_LOCALE;
}
