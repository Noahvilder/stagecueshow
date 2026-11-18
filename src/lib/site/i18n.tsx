import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "da" | "de" | "fr" | "es" | "sv" | "no";
export const LANGS: Lang[] = ["en", "da", "de", "fr", "es", "sv", "no"];
export const LANG_NAMES: Record<Lang, string> = { en: "English", da: "Dansk", de: "Deutsch", fr: "Français", es: "Español", sv: "Svenska", no: "Norsk" };
/** Text per language; English required, others fall back to English. */
export type Tr<T> = { en: T } & Partial<Record<Lang, T>>;
const KEY = "stagecue.lang";

export function detectLang(nav?: string): Lang {
  const l = (nav ?? "").slice(0, 2).toLowerCase();
  if (l === "nb" || l === "nn") return "no";
  return (LANGS as string[]).includes(l) ? (l as Lang) : "en";
}

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Lang | null;
    setLangState(saved && LANGS.includes(saved) ? saved : detectLang(navigator.language));
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: Lang) => { localStorage.setItem(KEY, l); setLangState(l); };
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLang() { return useContext(Ctx); }
/** Pick the string for the active language. */
export function useT() {
  const { lang } = useLang();
  return <T,>(v: Tr<T>): T => v[lang] ?? v.en;
}

/** Price per plan per currency; currency follows language. */
export const PRICES: Record<Lang, { monthly: string; yearly: string; lifetime: string }> = {
  en: { monthly: "$9.99", yearly: "$79", lifetime: "$149" },
  de: { monthly: "9,99 €", yearly: "79 €", lifetime: "149 €" },
  da: { monthly: "79 kr.", yearly: "699 kr.", lifetime: "1.499 kr." },
  fr: { monthly: "9,99 €", yearly: "79 €", lifetime: "149 €" },
  es: { monthly: "9,99 €", yearly: "79 €", lifetime: "149 €" },
  sv: { monthly: "109 kr", yearly: "899 kr", lifetime: "1 699 kr" },
  no: { monthly: "109 kr", yearly: "899 kr", lifetime: "1 699 kr" },
};
