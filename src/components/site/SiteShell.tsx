import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { LangProvider, LANGS, LANG_NAMES, useLang, useT, type Lang } from "@/lib/site/i18n";

const NAV = [
  { to: "/", l: { en: "Product", da: "Produkt", de: "Produkt", fr: "Produit", es: "Producto", sv: "Produkt", no: "Produkt" } },
  { to: "/priser", l: { en: "Pricing", da: "Priser", de: "Preise", fr: "Tarifs", es: "Precios", sv: "Priser", no: "Priser" } },
  { to: "/download", l: { en: "Download", da: "Download", de: "Download", fr: "Télécharger", es: "Descargar", sv: "Ladda ner", no: "Last ned" } },
  { to: "/support", l: { en: "Support", da: "Support", de: "Support", fr: "Support", es: "Soporte", sv: "Support", no: "Support" } },
] as const;

function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as Lang)}
      className="rounded border border-border bg-background px-2 py-1 text-xs font-bold text-foreground">
      {LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
    </select>
  );
}

const THEME_KEY = "stagecue.theme";
function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => { setLight(localStorage.getItem(THEME_KEY) === "light"); }, []);
  useEffect(() => { document.documentElement.classList.toggle("light", light); }, [light]);
  const flip = () => { localStorage.setItem(THEME_KEY, light ? "dark" : "light"); setLight(!light); };
  return (
    <button onClick={flip} aria-label={light ? "Dark theme" : "Light theme"} title={light ? "Dark theme" : "Light theme"}
      className="rounded border border-border p-1.5 text-muted-foreground hover:text-foreground">
      {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
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
            <ThemeToggle />
            <Link to="/show" className="rounded bg-go px-4 py-1.5 text-sm font-bold text-go-foreground">{t({ en: "Open show", da: "Åbn show", de: "Show öffnen", fr: "Ouvrir le show", es: "Abrir show", sv: "Öppna show", no: "Åpne show" })}</Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
          <span>© 2026 StageCue · {t({ en: "Show control for Windows", da: "Show control til Windows", de: "Show-Control für Windows" })}</span>
          <span className="flex gap-4">{NAV.slice(1).map((n) => <Link key={n.to} to={n.to}>{t(n.l)}</Link>)}<Link to="/privatliv">{t({ en: "Privacy", da: "Privatliv", de: "Datenschutz" })}</Link><Link to="/support" hash="ticket">{t({ en: "💡 Suggest a change", da: "💡 Foreslå ændring", de: "💡 Vorschlag" })}</Link><Link to="/vilkaar">{t({ en: "Terms", da: "Vilkår", de: "AGB" })}</Link></span>
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
