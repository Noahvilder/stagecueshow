import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, meta } from "@/components/site/SiteShell";
import { useT } from "@/lib/site/i18n";
import setupAsset from "@/assets/StageCue_1.0.1_x64-setup.exe.asset.json";

export const Route = createFileRoute("/download")({
  head: () => meta("Download StageCue for Windows", "Get StageCue for Windows 10/11. System requirements, quick start guide and release notes."),
  component: () => <SiteShell><Download /></SiteShell>,
});

function Download() {
  const t = useT();
  return (
    <section className="mx-auto max-w-4xl px-4 py-20">
      <h1 className="text-4xl font-black sm:text-5xl">{t({ en: "Download StageCue", da: "Download StageCue", de: "StageCue herunterladen" })}</h1>
      <div className="mt-10 rounded-2xl border-2 border-go bg-card p-8">
        <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Windows 10/11 · 64-bit</div>
        <div className="mt-1 text-xs text-muted-foreground">🇩🇰 Crafted in Denmark for live performers worldwide</div>
        <div className="mt-1 text-2xl font-black">StageCue_1.0.1_x64-setup.exe · v1.0.1</div>
        <a href={setupAsset.url} download="StageCue_1.0.1_x64-setup.exe" className="mt-6 hidden rounded-lg bg-go px-6 py-3 text-lg font-black text-go-foreground md:inline-block">⬇ {t({ en: "Download for Windows", da: "Download til Windows", de: "Für Windows herunterladen" })}</a>
        <div className="mt-6 md:hidden">
          <p className="text-sm text-muted-foreground">{t({ en: "The console app runs on a Windows PC. On your phone you can join a stage monitor:", da: "Pult-appen kører på en Windows-pc. På telefonen kan du åbne en scenemonitor:", de: "Die Pult-App läuft auf einem Windows-PC. Am Handy kannst du einen Bühnenmonitor öffnen:" })}</p>
          <Link to="/show" className="mt-3 inline-block rounded-lg bg-go px-6 py-3 font-black text-go-foreground">{t({ en: "Open show", da: "Åbn show", de: "Show öffnen" })}</Link>
        </div>
        <p className="mt-4 hidden text-sm text-muted-foreground md:block">{t({ en: "Until then, use the console in Chrome or Edge:", da: "Indtil da kan du bruge pulten i Chrome eller Edge:", de: "Bis dahin nutze das Pult in Chrome oder Edge:" })} <Link to="/hub" className="underline">{t({ en: "Open web console", da: "Åbn web-pulten", de: "Web-Pult öffnen" })}</Link></p>
      </div>
      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold">{t({ en: "System requirements", da: "Systemkrav", de: "Systemanforderungen" })}</h2>
          <ul className="mt-3 space-y-1 text-muted-foreground">
            <li>Windows 10/11 (64-bit)</li><li>4 GB RAM (8 GB {t({ en: "recommended", da: "anbefales", de: "empfohlen" })})</li>
            <li>{t({ en: "MIDI controller (optional)", da: "MIDI-controller (valgfrit)", de: "MIDI-Controller (optional)" })}</li>
            <li>{t({ en: "Wi-Fi for phones and stage monitors", da: "Wi-Fi til telefoner og scenemonitorer", de: "WLAN für Handys und Bühnenmonitore" })}</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-bold">{t({ en: "Quick start", da: "Kom godt i gang", de: "Schnellstart" })}</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>{t({ en: "Install and start free (or try Pro for 7 days)", da: "Installér og start gratis (eller prøv Pro i 7 dage)", de: "Installieren und kostenlos starten (oder Pro 7 Tage testen)" })}</li>
            <li>{t({ en: "Press Space to fire your first cue — or click Learn and tap your MIDI controller", da: "Tryk mellemrum for første cue – eller klik Lær og tryk på din MIDI-controller", de: "Leertaste für den ersten Cue – oder Lernen klicken und MIDI-Controller antippen" })}</li>
            <li>{t({ en: "Share the QR code with the band", da: "Del QR-koden med bandet", de: "QR-Code mit der Band teilen" })}</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
