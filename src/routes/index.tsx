import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { SiteShell, meta } from "@/components/site/SiteShell";
import { useT } from "@/lib/site/i18n";

export const Route = createFileRoute("/")({
  head: () => meta("StageCue – Professional show control for Windows", "Cue-based show control for Windows: one big GO button, plug & play MIDI controllers, multi-output audio and free wireless stage monitors for the whole band."),
  component: Landing,
});

type L = { en: string; da: string; de: string };

const ENGINE: { k: string; t: L; d: L }[] = [
  { k: "GO", t: { en: "One button. Every cue.", da: "Én knap. Alle cues.", de: "Ein Knopf. Jeder Cue." }, d: { en: "Spacebar, mouse or any controller fires the next cue. Readable from two metres away.", da: "Mellemrum, mus eller enhver controller affyrer næste cue. Læsbart på to meters afstand.", de: "Leertaste, Maus oder jeder Controller löst den nächsten Cue aus. Lesbar aus zwei Metern." } },
  { k: "MIDI", t: { en: "Plug & play MIDI controllers", da: "Plug & play MIDI-controllere", de: "Plug & Play MIDI-Controller" }, d: { en: "Any USB-MIDI pedal, keyboard or pad. Click Learn, tap your hardware — done. No extra software needed.", da: "Enhver USB-MIDI pedal, keyboard eller pad. Klik Lær, tryk på din hardware – færdig. Intet ekstra software.", de: "Jedes USB-MIDI-Pedal, Keyboard oder Pad. Lernen klicken, Hardware antippen – fertig. Keine Zusatzsoftware." } },
  { k: "OUT", t: { en: "Built-in MIDI & audio routing", da: "Indbygget MIDI- og lydrouting", de: "Integriertes MIDI- & Audio-Routing" }, d: { en: "Send notes, CC and program changes to synths, effects and lighting. Route every audio cue to its own output.", da: "Send noder, CC og program changes til synths, effekter og lys. Send hvert lyd-cue til sin egen udgang.", de: "Sende Noten, CC und Program Changes an Synths, Effekte und Licht. Jeder Audio-Cue auf eigenen Ausgang." } },
];

const ARENA: { k: string; t: L; d: L }[] = [
  { k: "📱", t: { en: "Free wireless stage monitors", da: "Gratis trådløse scenemonitorer", de: "Kostenlose kabellose Bühnenmonitore" }, d: { en: "The band scans a QR code and gets lyrics, chords, tabs and personal notes. No login, no cost.", da: "Bandet scanner en QR-kode og får tekst, akkorder, tabs og egne noter. Intet login, ingen pris.", de: "Die Band scannt einen QR-Code und bekommt Texte, Akkorde, Tabs und eigene Notizen. Kein Login, kostenlos." } },
  { k: "🔒", t: { en: "Show lock & panic", da: "Show lock & panik", de: "Show-Lock & Panik" }, d: { en: "Lock editing during the show. One key fades everything out if something goes wrong.", da: "Lås redigering under showet. Én tast fader alt ud, hvis noget går galt.", de: "Bearbeitung während der Show sperren. Eine Taste blendet alles aus, wenn etwas schiefgeht." } },
  { k: "📡", t: { en: "100% offline on stage", da: "100% offline på scenen", de: "100% offline auf der Bühne" }, d: { en: "The desktop app runs locally. Phones connect over your own Wi-Fi — no internet required.", da: "Desktop-appen kører lokalt. Telefoner forbindes over jeres eget Wi-Fi – intet internet nødvendigt.", de: "Die Desktop-App läuft lokal. Handys verbinden sich über euer eigenes WLAN – kein Internet nötig." } },
];


const ALL_FEATURES: { g: L; items: string[] }[] = [
  { g: { en: "Playback", da: "Afvikling", de: "Wiedergabe" }, items: ["GO / Panic / Hard stop", "Audio, MIDI, fade, stop, memo & group cues", "Auto-next / follow", "Show lock", "Cue numbers (decimals), manuscript ref & cue triggers", "Colour-coded cues", "Drag & drop reordering", "Waveform"] },
  { g: { en: "Audio & MIDI", da: "Lyd & MIDI", de: "Audio & MIDI" }, items: ["Up to 32-channel output routing", "Pre-fade listen (PFL)", "MIDI notes, CC & program change out", "MIDI controller learn", "Live MIDI monitor", "Custom names for inputs & outputs", "Click track generator with tempo ramps & voice count-in"] },
  { g: { en: "Band & stage", da: "Band & scene", de: "Band & Bühne" }, items: ["Free wireless stage monitors (QR)", "Lyrics, chords (ChordPro) & bass tabs", "Personal monitor notes & profiles", "Auto-scroll", "Phone remote"] },
  { g: { en: "Workflow", da: "Arbejdsgang", de: "Workflow" }, items: ["Simple / advanced layout", "Toggleable columns & hover help", "Custom keyboard shortcuts", "Search all functions (Ctrl+F)", "Setlist paste import", ".stagecue backup with audio", "Dark & light theme", "7 languages"] },
];

function AllFeatures() {
  const t = useT();
  return (
    <section id="funktioner" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
      <h2 className="text-3xl font-black">{t({ en: "Everything in StageCue", da: "Alle funktioner", de: "Alle Funktionen" })}</h2>
      <div className="mt-8 rounded-2xl border border-border bg-card">
        <div className="grid gap-8 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_FEATURES.map((f) => (
            <div key={f.g.en}>
              <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-go">{t(f.g)}</h3>
              <ul className="space-y-1.5 text-sm">{f.items.map((i) => <li key={i}>✓ {i}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const BENEFITS = [ENGINE[0]!, ARENA[0]!, ARENA[2]!];

function Benefits() {
  const t = useT();
  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-20 md:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.k} className="rounded-2xl border border-border bg-card p-6">
            <div className="font-mono text-sm font-black text-go">{b.k}</div>
            <h3 className="mt-3 text-xl font-black">{t(b.t)}</h3>
            <p className="mt-2 text-muted-foreground">{t(b.d)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConsoleMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex h-8 items-center gap-4 border-b border-border px-4 font-mono text-[11px] text-muted-foreground"><span>File</span><span>Edit</span><span>Cues</span><span>Playback</span><span>Windows</span><span className="ml-auto">00:42:17</span></div>
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          {["1    Intro – walk-in", "2    Opener – click", "2.5  Verse light", "3    Chorus FX", "4    Outro fade"].map((r, j) => (
            <div key={r} className={`rounded px-3 py-2 font-mono text-xs sm:text-sm ${j === 1 ? "bg-go text-go-foreground" : "bg-muted text-muted-foreground"}`}>{r}</div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex min-h-24 flex-1 items-center justify-center rounded-xl bg-go text-4xl font-black text-go-foreground">GO</div>
          <div className="rounded-lg bg-muted p-2 text-center font-mono text-xs font-bold text-standby">⏱ GO: "…and the lights go down"</div>
        </div>
      </div>
    </div>
  );
}

const TABS: { l: L; render: () => ReactNode }[] = [
  { l: { en: "Console", da: "Pulten", de: "Pult" }, render: () => <ConsoleMock /> },
  { l: { en: "Stage monitor", da: "Scenemonitor", de: "Bühnenmonitor" }, render: () => (
    <div className="mx-auto max-w-xs overflow-hidden rounded-[2rem] border-4 border-border bg-card p-5 font-mono shadow-2xl">
      <div className="text-xs text-muted-foreground">NOW · 2 Opener</div>
      <div className="mt-3 text-lg font-bold">[Em] Here we go [C] again</div>
      <pre className="mt-3 overflow-hidden text-xs text-muted-foreground">G|-----------|{"\n"}D|--2--2--4--|{"\n"}A|--2--2--2--|{"\n"}E|--0--0-----|</pre>
      <div className="mt-4 rounded bg-muted p-2 text-center text-sm font-bold text-standby">⏱ GO: Drums fill</div>
    </div>) },
  { l: { en: "Click & tools", da: "Click & værktøjer", de: "Click & Tools" }, render: () => (
    <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 text-center"><div className="text-5xl font-black">120</div><div className="text-sm text-muted-foreground">BPM · 4/4 · Moderato</div><div className="mt-4 flex justify-center gap-2">{[0,1,2,3].map((i) => <span key={i} className={`h-3 w-3 rounded-full ${i === 0 ? "bg-standby" : "bg-muted"}`} />)}</div></div>
      <div className="rounded-2xl border border-border bg-card p-4 font-mono text-xs"><div className="font-bold text-go">● Note On C3 · Pedal · 3 B</div><div className="mt-2 text-muted-foreground">CC 64 · Keys · 3 B</div><div className="text-muted-foreground">PC 12 · Helix · 2 B</div></div>
    </div>) },
];

function Tour() {
  const t = useT();
  const [i, setI] = useState(1);
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-3xl font-black">{t({ en: "Take a look", da: "Se den i brug", de: "Ein Blick hinein" })}</h2>
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab, j) => (
          <button key={tab.l.en} onClick={() => setI(j)} className={`rounded-full px-4 py-2 text-sm font-bold ${i === j ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>{t(tab.l)}</button>
        ))}
      </div>
      <div className="mt-8">{TABS[i]!.render()}</div>
    </section>
  );
}

function Landing() {
  return <SiteShell><LandingBody /></SiteShell>;
}

function LandingBody() {
  const t = useT();
  const rows: [L, string, string, string][] = [
    [{ en: "Runs on Windows", da: "Kører på Windows", de: "Läuft unter Windows" }, "✅", "❌", "✅"],
    [{ en: "Modern & actively developed", da: "Moderne og vedligeholdt", de: "Modern & aktiv entwickelt" }, "✅", "✅", "❌"],
    [{ en: "MIDI controller learn", da: "MIDI-controller indlæring", de: "MIDI-Controller lernen" }, "✅", "➖", "➖"],
    [{ en: "Free band stage monitors", da: "Gratis scenemonitorer til bandet", de: "Kostenlose Band-Monitore" }, "✅", "❌", "❌"],
    [{ en: "Phone remote", da: "Telefon-fjernbetjening", de: "Handy-Fernbedienung" }, "✅", "➖", "❌"],
  ];
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.3em] text-go">Show control · Windows 10/11</p>
        <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-6xl">{t({ en: "Professional show control for Windows. Built for the stage.", da: "Professionel show control til Windows. Bygget til scenen.", de: "Professionelle Show-Control für Windows. Gebaut für die Bühne." })}</h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{t({ en: "Audio, MIDI and setlists behind one GO button — for theatre, touring bands, churches, events and schools. A keyboard and mouse is all you need; controllers and phones are a bonus.", da: "Lyd, MIDI og setlister bag én GO-knap – til teater, turnerende bands, kirker, events og skoler. Tastatur og mus er alt, du behøver; controllere og telefoner er en bonus.", de: "Audio, MIDI und Setlisten hinter einem GO-Knopf – für Theater, Bands auf Tour, Kirchen, Events und Schulen. Tastatur und Maus genügen; Controller und Handys sind ein Bonus." })}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/download" className="hidden rounded-lg bg-go px-6 py-3 text-lg font-black text-go-foreground md:inline-block">⬇ {t({ en: "Download for Windows", da: "Download til Windows", de: "Für Windows laden" })}</Link>
          <Link to="/view" className="rounded-lg bg-go px-6 py-3 text-lg font-black text-go-foreground md:hidden">🎸 {t({ en: "Join stage monitor", da: "Åbn scenemonitor", de: "Bühnenmonitor öffnen" })}</Link>
          <Link to="/priser" className="rounded-lg border-2 border-border px-6 py-3 text-lg font-bold">{t({ en: "Free vs Pro", da: "Gratis vs Pro", de: "Free vs Pro" })}</Link>
          <a href="#funktioner" className="px-2 py-3 text-lg font-semibold text-muted-foreground hover:text-foreground">{t({ en: "All features ↓", da: "Alle funktioner ↓", de: "Alle Funktionen ↓" })}</a>
        </div>
        <div className="mt-14"><ConsoleMock /></div>
      </section>

      <Benefits />
      <Tour />

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-black">{t({ en: "Why StageCue?", da: "Hvorfor StageCue?", de: "Warum StageCue?" })}</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead className="text-sm uppercase tracking-wider text-muted-foreground"><tr><th className="py-2"></th><th>StageCue</th><th>QLab</th><th>Multiplay</th></tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r[0].en}><td className="py-3 font-semibold">{t(r[0])}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AllFeatures />

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="rounded-2xl border-2 border-go p-10 text-center">
          <h2 className="text-3xl font-black">{t({ en: "Ready for your next show?", da: "Klar til næste show?", de: "Bereit für die nächste Show?" })}</h2>
          <p className="mt-3 text-muted-foreground">{t({ en: "Start free. Try every Pro feature for 7 days. Stage monitors are always free.", da: "Start gratis. Prøv alle Pro-funktioner i 7 dage. Scenemonitorer er altid gratis.", de: "Kostenlos starten. Alle Pro-Funktionen 7 Tage testen. Bühnenmonitore sind immer kostenlos." })}</p>
          <Link to="/priser" className="mt-6 inline-block rounded-lg bg-go px-6 py-3 font-black text-go-foreground">{t({ en: "See pricing", da: "Se priser", de: "Preise ansehen" })}</Link>
        </div>
      </section>
    </>
  );
}
