import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "da" | "de";
export const LANGS: Lang[] = ["en", "da", "de"];
const KEY = "stagecue.lang";

export function detectLang(nav?: string): Lang {
  const l = (nav ?? "").slice(0, 2).toLowerCase();
  return l === "da" || l === "de" ? l : "en";
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
  return <T,>(v: Record<Lang, T>) => v[lang];
}

/** Price per plan per currency; currency follows language. */
export const PRICES: Record<Lang, { monthly: string; yearly: string; lifetime: string }> = {
  en: { monthly: "$9.99", yearly: "$79", lifetime: "$149" },
  de: { monthly: "9,99 €", yearly: "79 €", lifetime: "149 €" },
  da: { monthly: "79 kr.", yearly: "599 kr.", lifetime: "1.099 kr." },
};
