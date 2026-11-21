import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, meta } from "@/components/site/SiteShell";
import { useT } from "@/lib/site/i18n";
import setupAsset from "@/assets/StageCue_1.1.1_x64-setup.exe.asset.json";

export const Route = createFileRoute("/download")({
  head: () => meta("Download StageCue for Windows", "Get StageCue for Windows 10/11. System requirements, quick start guide and release notes."),
  component: () => <SiteShell><Download /></SiteShell>,
});

function Download() {
  const t = useT();
  return (
    <section className="mx-auto max-w-4xl px-4 py-20">
      <h1 className="text-4xl font-black sm:text-5xl">{t({ en: "Download StageCue", da: "Download StageCue", de: "StageCue herunterladen", fr: "Télécharger StageCue", es: "Descargar StageCue", sv: "Ladda ner StageCue", no: "Last ned StageCue" })}</h1>
      <div className="mt-10 rounded-2xl border-2 border-go bg-card p-8">
        <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Windows 10/11 · 64-bit</div>
        <div className="mt-1 text-xs text-muted-foreground">🇩🇰 Crafted in Denmark for live performers worldwide</div>
        <div className="mt-1 text-2xl font-black">StageCue_1.1.1_x64-setup.exe · v1.1.1</div>
        <a href={setupAsset.url} download="StageCue_1.1.1_x64-setup.exe" className="mt-6 hidden rounded-lg bg-go px-6 py-3 text-lg font-black text-go-foreground md:inline-block">⬇ {t({ en: "Download for Windows", da: "Download til Windows", de: "Für Windows herunterladen", fr: "Télécharger pour Windows", es: "Descargar para Windows", sv: "Ladda ner för Windows", no: "Last ned for Windows" })}</a>
        <div className="mt-6 md:hidden">
          <p className="text-sm text-muted-foreground">{t({ en: "The console app runs on a Windows PC. On your phone you can join a stage monitor:", da: "Pult-appen kører på en Windows-pc. På telefonen kan du åbne en scenemonitor:", de: "Die Pult-App läuft auf einem Windows-PC. Am Handy kannst du einen Bühnenmonitor öffnen:", fr: "L'application console fonctionne sur un PC Windows. Sur votre téléphone, vous pouvez rejoindre un moniteur de scène :", es: "La aplicación de consola se ejecuta en un PC con Windows. En tu teléfono puedes unirte a un monitor de escenario:", sv: "Konsolappen körs på en Windows-dator. På din telefon kan du ansluta till en scenmonitor:", no: "Konsollappen kjører på en Windows-PC. På telefonen din kan du koble deg til en scenemonitor:" })}</p>
          <Link to="/show" className="mt-3 inline-block rounded-lg bg-go px-6 py-3 font-black text-go-foreground">{t({ en: "Open show", da: "Åbn show", de: "Show öffnen", fr: "Ouvrir le spectacle", es: "Abrir show", sv: "Öppna show", no: "Åpne show" })}</Link>
        </div>
        <p className="mt-4 hidden text-sm text-muted-foreground md:block">{t({ en: "Until then, use the console in Chrome or Edge:", da: "Indtil da kan du bruge pulten i Chrome eller Edge:", de: "Bis dahin nutze das Pult in Chrome oder Edge:", fr: "En attendant, utilisez la console dans Chrome ou Edge :", es: "Hasta entonces, utiliza la consola en Chrome o Edge:", sv: "Fram tills dess kan du använda konsolen i Chrome eller Edge:", no: "Frem til da kan du bruke konsollen i Chrome eller Edge:" })} <Link to="/hub" className="underline">{t({ en: "Open web console", da: "Åbn web-pulten", de: "Web-Pult öffnen", fr: "Ouvrir la console web", es: "Abrir consola web", sv: "Öppna webbkonsol", no: "Åpne webkonsoll" })}</Link></p>
      </div>
      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold">{t({ en: "System requirements", da: "Systemkrav", de: "Systemanforderungen", fr: "Configuration requise", es: "Requisitos del sistema", sv: "Systemkrav", no: "Systemkrav" })}</h2>
          <ul className="mt-3 space-y-1 text-muted-foreground">
            <li>Windows 10/11 (64-bit)</li><li>4 GB RAM (8 GB {t({ en: "recommended", da: "anbefales", de: "empfohlen", fr: "recommandé", es: "recomendado", sv: "rekommenderas", no: "anbefalt" })})</li>
            <li>{t({ en: "MIDI controller (optional)", da: "MIDI-controller (valgfrit)", de: "MIDI-Controller (optional)", fr: "Contrôleur MIDI (optionnel)", es: "Controlador MIDI (opcional)", sv: "MIDI-kontroller (tillval)", no: "MIDI-kontroller (valgfritt)" })}</li>
            <li>{t({ en: "Wi-Fi for phones and stage monitors", da: "Wi-Fi til telefoner og scenemonitorer", de: "WLAN für Handys und Bühnenmonitore", fr: "Wi-Fi pour téléphones et moniteurs de scène", es: "Wi-Fi para teléfonos y monitores de escenario", sv: "Wi-Fi för telefoner och scenmonitorer", no: "Wi-Fi for telefoner og scenemonitorer" })}</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-bold">{t({ en: "Quick start", da: "Kom godt i gang", de: "Schnellstart", fr: "Démarrage rapide", es: "Inicio rápido", sv: "Snabbstart", no: "Hurtigstart" })}</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>{t({ en: "Install and start free (or try Pro for 7 days)", da: "Installér og start gratis (eller prøv Pro i 7 dage)", de: "Installieren und kostenlos starten (oder Pro 7 Tage testen)", fr: "Installez et commencez gratuitement (ou essayez Pro pendant 7 jours)", es: "Instala y empieza gratis (o prueba Pro durante 7 días)", sv: "Installera och börja gratis (eller prova Pro i 7 dagar)", no: "Installer og start gratis (eller prøv Pro i 7 dager)" })}</li>
            <li>{t({ en: "Press Space to fire your first cue — or click Learn and tap your MIDI controller", da: "Tryk mellemrum for første cue – eller klik Lær og tryk på din MIDI-controller", de: "Leertaste für den ersten Cue – oder Lernen klicken und MIDI-Controller antippen", fr: "Appuyez sur Espace pour lancer votre premier cue — ou cliquez sur Learn et appuyez sur votre contrôleur MIDI", es: "Pulsa Espacio para activar tu primer cue, o haz clic en Learn y toca tu controlador MIDI", sv: "Tryck på Mellanslag för att starta din första cue — eller klicka på Learn och tryck på din MIDI-kontroller", no: "Trykk på Mellomrom for å trigge ditt første cue — eller klikk på Learn og trykk på MIDI-kontrolleren din" })}</li>
            <li>{t({ en: "Share the QR code with the band", da: "Del QR-koden med bandet", de: "QR-Code mit der Band teilen", fr: "Partagez le code QR avec le groupe", es: "Comparte el código QR con el grupo", sv: "Dela QR-koden med bandet", no: "Del QR-koden med bandet" })}</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
