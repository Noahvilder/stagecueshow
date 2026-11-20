import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

const URL = "https://stagecueshow.com/qlab-alternative-windows-de";
const TITLE = "QLab Alternative für Windows — StageCue";
const DESC = "QLab für Windows gesucht? StageCue ist eine Show-Control-Software für Windows 10/11: Audio-Cues, MIDI, GO-Taste und Bühnenmonitore auf dem Handy. Kostenlos starten.";

export const Route = createFileRoute("/qlab-alternative-windows-de")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "de_DE" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "canonical", href: URL },
      { rel: "alternate", hrefLang: "de", href: URL },
      { rel: "alternate", hrefLang: "en", href: "https://stagecueshow.com/qlab-alternative-windows" },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "StageCue",
        inLanguage: "de",
        operatingSystem: "Windows 10, Windows 11",
        applicationCategory: "MultimediaApplication",
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        url: "https://stagecueshow.com/",
      }),
    }],
  }),
  component: () => <SiteShell><Page /></SiteShell>,
});

const rows: [string, string, string][] = [
  ["Betriebssystem", "Windows 10/11", "nur macOS"],
  ["Preis", "Gratis-Plan, Pro ab ca. 11 € / Monat", "Ab 399 $ pro Lizenz"],
  ["Audio-Cues mit Fades", "Ja", "Ja"],
  ["MIDI ein/aus", "Ja", "Ja"],
  ["Bühnenmonitore auf dem Handy (Texte, Notizen, nächster Cue)", "Eingebaut, per QR-Code", "Nicht eingebaut"],
  ["Click-Track-Generator", "Eingebaut", "Nicht eingebaut"],
];

function Page() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-20" lang="de">
      <h1 className="text-4xl font-black sm:text-5xl">Eine QLab-Alternative für Windows</h1>
      <p className="mt-6 text-lg text-muted-foreground">QLab ist ein beliebtes Cue-basiertes Wiedergabeprogramm für Theater und Live-Shows – läuft aber nur auf dem Mac. StageCue bietet Windows-Nutzern dieselbe Arbeitsweise: Cue-Liste anlegen, GO drücken, Show fahren. Dazu kommen Bühnenmonitore für die Band direkt auf dem eigenen Handy.</p>
      <h2 className="mt-12 text-2xl font-bold">Kurzer Vergleich</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted"><tr><th className="p-3"></th><th className="p-3">StageCue</th><th className="p-3">QLab</th></tr></thead>
          <tbody>{rows.map(([a, b, c]) => <tr key={a} className="border-t border-border"><td className="p-3 font-medium">{a}</td><td className="p-3">{b}</td><td className="p-3 text-muted-foreground">{c}</td></tr>)}</tbody>
        </table>
      </div>
      <h2 className="mt-12 text-2xl font-bold">Für wen?</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
        <li>Schulen, Amateurtheater und Kulturhäuser mit Windows-PCs</li>
        <li>Bands mit Backing-Tracks, Click und MIDI von einem Laptop</li>
        <li>Veranstaltungstechniker, die einen schnellen, zuverlässigen GO-Ablauf brauchen</li>
      </ul>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/download" className="rounded-lg bg-go px-6 py-3 font-black text-go-foreground">⬇ Kostenlos für Windows herunterladen</Link>
        <Link to="/priser" className="rounded-lg border border-border px-6 py-3 font-bold">Preise ansehen</Link>
      </div>
      <p className="mt-16 text-xs text-muted-foreground">QLab® ist eine eingetragene Marke von Figure 53, LLC. StageCue ist ein eigenständiges Produkt und steht in keiner Verbindung zu Figure 53, LLC und wird von dieser weder gesponsert noch unterstützt.</p>
    </article>
  );
}
