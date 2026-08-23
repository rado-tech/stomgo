/** Qo'llab-quvvatlanadigan tillar */
export const LOCALES = ["uz", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";

export const LOCALE_NAMES: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
};

/** Cookie va AsyncStorage kaliti — sayt va ilovada bir xil */
export const LOCALE_KEY = "sg_lang";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}
