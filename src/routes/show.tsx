import { createFileRoute, Link } from "@tanstack/react-router";
import { meta } from "@/components/site/SiteShell";
import { LangProvider, useT } from "@/lib/site/i18n";

export const Route = createFileRoute("/show")({
  head: () => meta("Open show – StageCue", "Choose your role: console for technicians or stage monitor for musicians and singers."),
  component: () => <LangProvider><ShowPicker /></LangProvider>,
});

function ShowPicker() {
  const t = useT();
  const card = "flex flex-col gap-2 rounded-2xl border-2 border-border bg-card p-6 text-left transition hover:border-go";
  return (
    <div className="min-h-screen bg-background p-4 text-foreground sm:p-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <Link to="/" className="web-only self-start rounded bg-secondary px-3 py-1.5 text-sm font-semibold">← {t({ en: "Back to home", da: "Tilbage til forsiden", de: "Zurück zur Startseite", fr: "Retour à l'accueil", es: "Volver al inicio", sv: "Tillbaka till startsidan", no: "Tilbake til forsiden" })}</Link>
        <div>
          <div className="font-mono text-xs font-bold uppercase tracking-[0.4em] text-go">StageCue</div>
          <h1 className="mt-2 text-4xl font-black">{t({ en: "Open show", da: "Åbn show", de: "Show öffnen", fr: "Ouvrir le show", es: "Abrir show", sv: "Öppna show", no: "Åpne show" })}</h1>
          <p className="mt-2 text-muted-foreground">{t({ en: "What is your role today?", da: "Hvad er din rolle i dag?", de: "Was ist heute deine Rolle?", fr: "Quel est votre rôle aujourd'hui ?", es: "¿Cuál es tu papel hoy?", sv: "Vilken roll har du idag?", no: "Hva er rollen din i dag?" })}</p>
        </div>
        <Link to="/hub" className={card}>
          <span className="text-3xl">🎛️</span>
          <span className="text-2xl font-black">{t({ en: "Console / Technician", da: "Pult / Tekniker", de: "Pult / Techniker", fr: "Console / Technicien", es: "Consola / Técnico", sv: "Konsol / Tekniker", no: "Konsoll / Tekniker" })}</span>
          <span className="text-muted-foreground">{t({ en: "For technicians who run the show, test cues or build shows.", da: "Til teknikere, der afvikler, tester cues eller bygger shows.", de: "Für Techniker, die die Show fahren, Cues testen oder Shows bauen.", fr: "Pour les techniciens qui pilotent, testent des cues ou créent des shows.", es: "Para técnicos que operan, prueban cues o crean shows.", sv: "För tekniker som kör, testar cues eller bygger shower.", no: "For teknikere som kjører, tester cues eller bygger show." })}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-standby">{t({ en: "Requires show admin login", da: "Kræver login som show-admin", de: "Erfordert Show-Admin-Login", fr: "Connexion admin du show requise", es: "Requiere acceso de administrador del show", sv: "Kräver inloggning som show-admin", no: "Krever innlogging som show-admin" })}</span>
        </Link>
        <Link to="/view" search={{}} className={card}>
          <span className="text-3xl">🎸</span>
          <span className="text-2xl font-black">{t({ en: "Monitor / Musician", da: "Monitor / Musiker", de: "Monitor / Musiker", fr: "Moniteur / Musicien", es: "Monitor / Músico", sv: "Monitor / Musiker", no: "Monitor / Musiker" })}</span>
          <span className="text-muted-foreground">{t({ en: "For you who play or sing on stage – then pick your stage role.", da: "Til dig, der spiller eller synger på scenen – derefter vælger du din rolle på scenen.", de: "Für dich, der auf der Bühne spielt oder singt – danach wählst du deine Rolle.", fr: "Pour vous qui jouez ou chantez sur scène – puis choisissez votre rôle.", es: "Para ti que tocas o cantas en el escenario – luego eliges tu papel.", sv: "För dig som spelar eller sjunger på scen – sedan väljer du din roll.", no: "For deg som spiller eller synger på scenen – deretter velger du rollen din." })}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-standby">{t({ en: "Requires your own free login", da: "Kræver eget gratis login", de: "Erfordert eigenes kostenloses Login", fr: "Nécessite votre propre compte gratuit", es: "Requiere tu propia cuenta gratuita", sv: "Kräver egen gratis inloggning", no: "Krever egen gratis innlogging" })}</span>
        </Link>
      </div>
    </div>
  );
}
