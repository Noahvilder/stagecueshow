import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Globe, Moon, Sun } from "lucide-react";
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
    <label className="relative flex items-center rounded border border-border p-1.5 text-muted-foreground hover:text-foreground" title="Language">
      <Globe className="h-4 w-4" />
      <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as Lang)}
        className="absolute inset-0 cursor-pointer bg-background text-foreground opacity-0">
        {LANGS.map((l) => <option key={l} value={l} className="bg-background text-foreground">{LANG_NAMES[l]}</option>)}
      </select>
    </label>
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3 pb-2">
          <Link to="/" className="font-mono text-lg font-black tracking-widest text-go">STAGECUE</Link>
          <div className="flex items-center gap-2">
            <Link to="/konto" className="rounded border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary">{t({ en: "Account", da: "Konto", de: "Konto", fr: "Compte", es: "Cuenta", sv: "Konto", no: "Konto" })}</Link>
            <Link to="/show" className="rounded bg-go px-4 py-1.5 text-sm font-bold text-go-foreground">{t({ en: "Open show", da: "Åbn show", de: "Show öffnen", fr: "Ouvrir le show", es: "Abrir show", sv: "Öppna show", no: "Åpne show" })}</Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-2">
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto text-sm">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="whitespace-nowrap rounded px-2.5 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-bold" }}>{t(n.l)}</Link>
            ))}
          </nav>
          <LangSwitch />
          <ThemeToggle />
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
          <span>© 2026 StageCue · {t({ en: "Show control for Windows", da: "Show control til Windows", de: "Show-Control für Windows", fr: "Show control pour Windows", es: "Control de espectáculos para Windows", sv: "Show control för Windows", no: "Show control for Windows" })} · 🇩🇰 Crafted in Denmark for live performers worldwide</span>
          <span className="flex gap-4">{NAV.slice(1).map((n) => <Link key={n.to} to={n.to}>{t(n.l)}</Link>)}<Link to="/privatliv">{t({ en: "Privacy", da: "Privatliv", de: "Datenschutz", fr: "Confidentialité", es: "Privacidad", sv: "Integritet", no: "Personvern" })}</Link><Link to="/support" hash="ticket">{t({ en: "💡 Suggest a change", da: "💡 Foreslå ændring", de: "💡 Vorschlag", fr: "💡 Suggérer une modification", es: "💡 Sugerir un cambio", sv: "💡 Föreslå en ändring", no: "💡 Foreslå en endring" })}</Link><Link to="/qlab-alternative-windows">QLab alternative</Link><Link to="/midi-pedal-guide">MIDI pedal guide</Link><Link to="/vilkaar">{t({ en: "Terms", da: "Vilkår", de: "AGB", fr: "Conditions", es: "Términos", sv: "Villkor", no: "Vilkår" })}</Link></span>
        </div>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-6 text-xs text-muted-foreground"><img src="/asio-compatible.svg" alt="ASIO compatible" className="h-6 w-auto" /><span>ASIO is a trademark of Steinberg Media Technologies GmbH, registered in Europe and other countries.</span></div>
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
