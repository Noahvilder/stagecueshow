import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
    <section className="mx-auto max-w-6xl px-4 pb-20">
      <details className="group rounded-2xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between p-6 text-xl font-black">
          {t({ en: "See all features", da: "Se alle funktioner", de: "Alle Funktionen ansehen" })}
          <span className="transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="grid gap-8 border-t border-border p-6 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_FEATURES.map((f) => (
            <div key={f.g.en}>
              <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-go">{t(f.g)}</h3>
              <ul className="space-y-1.5 text-sm">{f.items.map((i) => <li key={i}>✓ {i}</li>)}</ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

/** Returns 0..1 progress of a tall section scrolled through the viewport. */
function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setP(Math.min(1, Math.max(0, -r.top / (total || 1))));
    };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return [ref, p] as const;
}

function Engine() {
  const t = useT();
  const [ref, p] = useScrollProgress<HTMLElement>();
  const i = Math.min(ENGINE.length - 1, Math.floor(p * ENGINE.length));
  return (
    <section ref={ref} style={{ height: `${ENGINE.length * 90}vh` }} className="relative border-t border-border">
      <div className="sticky top-0 flex h-screen items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-go">{t({ en: "The precision engine", da: "Præcisionsmotoren", de: "Die Präzisions-Engine" })}</p>
            {ENGINE.map((s, j) => (
              <div key={s.k} className={`transition-all duration-500 ${j === i ? "mt-6 opacity-100" : "pointer-events-none absolute opacity-0"}`}>
                <h2 className="text-3xl font-black sm:text-5xl">{t(s.t)}</h2>
                <p className="mt-4 text-lg text-muted-foreground">{t(s.d)}</p>
              </div>
            ))}
            <div className="mt-8 flex gap-2">{ENGINE.map((s, j) => <span key={s.k} className={`h-1 w-10 rounded ${j <= i ? "bg-go" : "bg-border"}`} />)}</div>
          </div>
          {/* Mock console that "zooms" to the active feature */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex h-7 items-center gap-4 border-b border-border px-3 font-mono text-[10px] text-muted-foreground"><span>File</span><span>Edit</span><span>Cues</span><span>Playback</span><span>Windows</span></div>
            <div className="grid h-[calc(100%-1.75rem)] grid-cols-3 gap-2 p-3 transition-transform duration-700" style={{ transform: `scale(${1 + (i === 0 ? 0.08 : 0)}) translateY(${i * -2}%)` }}>
              <div className="col-span-2 space-y-1.5">
                {["01  Intro", "02  Opener – click", "03  Verse light", "04  Chorus FX", "05  Outro fade"].map((r, j) => (
                  <div key={r} className={`rounded px-2 py-1.5 font-mono text-xs ${j === 1 ? "bg-go text-go-foreground" : "bg-muted text-muted-foreground"}`}>{r}</div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <div className={`flex flex-1 items-center justify-center rounded-xl text-3xl font-black transition-all duration-500 ${i === 0 ? "bg-go text-go-foreground ring-4 ring-go/40" : "bg-muted text-muted-foreground"}`}>GO</div>
                <div className={`rounded-lg p-2 font-mono text-[10px] transition-all duration-500 ${i === 1 ? "bg-primary text-primary-foreground ring-4 ring-primary/40" : "bg-muted text-muted-foreground"}`}>MIDI IN · Learn ●</div>
                <div className={`rounded-lg p-2 font-mono text-[10px] transition-all duration-500 ${i === 2 ? "bg-primary text-primary-foreground ring-4 ring-primary/40" : "bg-muted text-muted-foreground"}`}>OUT 1-2 · PC 12 · CC 64</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Arena() {
  const t = useT();
  const [ref, p] = useScrollProgress<HTMLElement>();
  const i = Math.min(ARENA.length - 1, Math.floor(p * ARENA.length));
  return (
    <section ref={ref} style={{ height: `${ARENA.length * 90}vh` }} className="relative bg-foreground text-background">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        {/* stage lights driven by scroll */}
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at ${20 + p * 60}% 0%, color-mix(in oklch, var(--go) 45%, transparent), transparent 55%), radial-gradient(ellipse at ${80 - p * 60}% 0%, color-mix(in oklch, var(--primary) 35%, transparent), transparent 50%)` }} />
        <div className="relative mx-auto w-full max-w-4xl px-4 text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] opacity-70">{t({ en: "The live arena", da: "Livescenen", de: "Die Live-Arena" })}</p>
          <div className="mt-6 text-6xl">{ARENA[i]!.k}</div>
          <h2 key={i} className="mt-4 text-4xl font-black sm:text-6xl">{t(ARENA[i]!.t)}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg opacity-80">{t(ARENA[i]!.d)}</p>
        </div>
      </div>
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
        </div>
      </section>

      <Engine />
      <Arena />

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
