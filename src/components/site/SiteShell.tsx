import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LangProvider, LANGS, useLang, useT } from "@/lib/site/i18n";

const NAV = [
  { to: "/", l: { en: "Product", da: "Produkt", de: "Produkt" } },
  { to: "/priser", l: { en: "Pricing", da: "Priser", de: "Preise" } },
  { to: "/download", l: { en: "Download", da: "Download", de: "Download" } },
  { to: "/support", l: { en: "Support", da: "Support", de: "Support" } },
] as const;

function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded border border-border text-xs font-bold" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
          className={`px-2 py-1 uppercase ${lang === l ? "bg-go text-go-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
      ))}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="font-mono text-lg font-black tracking-widest text-go">STAGECUE</Link>
          <nav className="order-last flex w-full flex-wrap gap-1 text-sm sm:order-none sm:w-auto sm:flex-1">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="rounded px-3 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-bold" }}>{t(n.l)}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LangSwitch />
            <Link to="/view" className="rounded border border-border px-3 py-1.5 text-sm font-semibold md:hidden">{t({ en: "Join monitor", da: "Scenemonitor", de: "Monitor" })}</Link>
            <Link to="/hub" className="hidden rounded bg-go px-4 py-1.5 text-sm font-bold text-go-foreground md:block">{t({ en: "Open console", da: "Åbn pulten", de: "Pult öffnen" })}</Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
          <span>© 2026 StageCue · {t({ en: "Show control for Windows", da: "Show control til Windows", de: "Show-Control für Windows" })}</span>
          <span className="flex gap-4">{NAV.slice(1).map((n) => <Link key={n.to} to={n.to}>{t(n.l)}</Link>)}</span>
        </div>
      </footer>
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return <LangProvider><Shell>{children}</Shell></LangProvider>;
}

export function meta(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
