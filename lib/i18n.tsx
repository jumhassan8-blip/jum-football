"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const LOCALES = [
  { code: "en", native: "English", dir: "ltr" },
  { code: "es", native: "Español", dir: "ltr" },
  { code: "fr", native: "Français", dir: "ltr" },
  { code: "de", native: "Deutsch", dir: "ltr" },
  { code: "tr", native: "Türkçe", dir: "ltr" },
  { code: "ar", native: "العربية", dir: "rtl" },
  { code: "pt", native: "Português", dir: "ltr" },
  { code: "it", native: "Italiano", dir: "ltr" },
  { code: "ru", native: "Русский", dir: "ltr" },
  { code: "hi", native: "हिन्दी", dir: "ltr" },
  { code: "zh", native: "中文", dir: "ltr" },
  { code: "ja", native: "日本語", dir: "ltr" },
  { code: "ko", native: "한국어", dir: "ltr" },
  { code: "id", native: "Bahasa Indonesia", dir: "ltr" },
  { code: "th", native: "ไทย", dir: "ltr" },
  { code: "vi", native: "Tiếng Việt", dir: "ltr" },
  { code: "sw", native: "Kiswahili", dir: "ltr" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];
type Dict = Record<string, string>;

const LOCALE_KEY = "jum-locale";
const RTL_LOCALES = new Set(["ar"]);
const warned = new Set<string>();

async function loadDict(code: LocaleCode): Promise<Dict> {
  // Dynamic import keeps each locale a separate lazy chunk.
  const mod = (await import(`../locales/${code}.json`)) as { default: Dict };
  return mod.default;
}

type I18nCtx = {
  locale: LocaleCode;
  dir: "ltr" | "rtl";
  setLocale: (l: LocaleCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ready: boolean;
};

const Ctx = createContext<I18nCtx>({
  locale: "en",
  dir: "ltr",
  setLocale: () => {},
  t: (k) => k,
  ready: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>("en");
  const [dicts, setDicts] = useState<Record<string, Dict>>({});
  const [ready, setReady] = useState(false);

  // first launch: auto-detect device locale, then persist choice
  useEffect(() => {
    const detect = (): LocaleCode => {
      if (typeof window === "undefined") return "en";
      const saved = window.localStorage.getItem(LOCALE_KEY);
      if (saved && LOCALES.some((l) => l.code === saved)) return saved as LocaleCode;
      const nav = (window.navigator.languages?.[0] ?? window.navigator.language ?? "en")
        .slice(0, 2)
        .toLowerCase();
      const hit = LOCALES.find((l) => l.code === nav);
      return (hit?.code ?? "en") as LocaleCode;
    };
    const l = detect();
    setLocaleState(l);
    Promise.all([loadDict("en"), loadDict(l)])
      .then(([en, active]) => {
        setDicts((d) => ({ ...d, en, [l]: active }));
        setReady(true);
      })
      .catch(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((l: LocaleCode) => {
    setLocaleState(l);
    window.localStorage.setItem(LOCALE_KEY, l);
    if (!dicts[l]) {
      loadDict(l)
        .then((d) => setDicts((prev) => ({ ...prev, [l]: d })))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dir: "ltr" | "rtl" = RTL_LOCALES.has(locale) ? "rtl" : "ltr";

  // mirror <html> for the whole app (nav, rows, icons)
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const active = dicts[locale];
      let s = active?.[key];
      if (s === undefined) {
        // fallback: missing key → English, logged for the translation pipeline
        s = dicts.en?.[key];
        if (typeof window !== "undefined" && !warned.has(`${locale}:${key}`)) {
          warned.add(`${locale}:${key}`);
          console.warn(`[i18n] missing key "${key}" for locale "${locale}" — fell back to English`);
        }
      }
      if (s === undefined) {
        if (typeof window !== "undefined" && !warned.has(key)) {
          warned.add(key);
          console.warn(`[i18n] missing key "${key}" in English fallback`);
        }
        return key;
      }
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
      return s;
    },
    [locale, dicts]
  );

  const value = useMemo(
    () => ({ locale, dir, setLocale, t, ready }),
    [locale, dir, setLocale, t, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}

/** Short alias for the hot path: const t = useT(); */
export function useT() {
  return useContext(Ctx).t;
}
