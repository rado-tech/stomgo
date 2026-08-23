import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { uz, type TranslationKey } from "./uz";
import { ru } from "./ru";
import { DEFAULT_LOCALE, LOCALE_KEY, LOCALES, LOCALE_NAMES, isLocale, type Locale } from "./types";

export { LOCALES, LOCALE_NAMES, type Locale, type TranslationKey };

const DICTS: Record<Locale, Record<TranslationKey, string>> = { uz, ru };

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

/**
 * Til konteksti.
 * Tanlov AsyncStorage'da saqlanadi — saytdagi cookie bilan bir xil kalit (sg_lang).
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    void AsyncStorage.getItem(LOCALE_KEY).then((v) => {
      if (isLocale(v)) setLocaleState(v);
    });
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    void AsyncStorage.setItem(LOCALE_KEY, l);
  }, []);

  const value = useMemo<Ctx>(() => {
    const dict = DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
    return {
      locale,
      setLocale,
      t: (key, vars) => {
        let s: string = dict[key] ?? uz[key] ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
        return s;
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT faqat I18nProvider ichida ishlatiladi");
  return ctx;
}
