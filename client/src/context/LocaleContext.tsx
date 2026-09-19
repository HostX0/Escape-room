import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Locale } from "../i18n/translations";
import { translations } from "../i18n/translations";

const STORAGE_KEY = "escape-room-locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  dir: "ltr" | "rtl";
  t: (key: string) => string;
};

const Context = createContext<LocaleContextValue | null>(null);

function readStored(): Locale {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "ar" ? "ar" : "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStored);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);
  const dir: "ltr" | "rtl" = locale === "ar" ? "rtl" : "ltr";
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "ar" ? "ar" : "en";
    }
  }, [locale]);
  const t = useCallback((key: string) => translations[locale][key] ?? key, [locale]);
  const value = useMemo(() => ({ locale, setLocale, dir, t }), [locale, setLocale, dir, t]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
