import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, meta } from "@/components/site/SiteShell";

export const Route = createFileRoute("/")({
  head: () => meta("StageCue – Show control til live koncerter på Windows", "Cue- og show control til Windows: kæmpe GO-knap, fodpedaler, multi-MIDI, flere lydudgange og gratis scenemonitors med akkorder til bandet."),
  component: Landing,
});

const FEATURES = [
  { icon: "🟢", t: "Kæmpe GO & scene-HUD", d: "Se sang, aktivt og næste cue tydeligt fra 2 meters afstand – mens du spiller." },
  { icon: "🦶", t: "Fodpedal-klar", d: "Nektar Pacer og alle MIDI-pedaler. Tryk 'Lær pedal' og træd – færdig." },
  { icon: "🎹", t: "Multi-MIDI", d: "Note, CC, PC, pitchbend, clock og mere – til flere enheder samtidig fra ét cue." },
  { icon: "🔊", t: "Flere lydudgange", d: "Send hvert lyd-cue til sin egen udgang, VoiceMeeter eller lydkort. Fades og trim." },
  { icon: "🎤", t: "Gratis scenemonitors", d: "Bandet scanner en QR-kode og får egne akkorder, lyrics og noter – uden login." },
  { icon: "📱", t: "Telefon-fjernbetjening", d: "Test cues fra salen og byg dit show direkte på telefonen." },
];

function Landing() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.3em] text-go">Show control · Windows 10/11</p>
        <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-6xl">Det professionelle cue-system til Windows. Bygget til scenen.</h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">QLab findes kun til Mac, og Multiplay er gået i stå. StageCue giver dig lyd, MIDI og setlister med én GO-knap – stabilt, hurtigt og lavet af en musiker, der selv står på scenen.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/download" className="rounded-lg bg-go px-6 py-3 text-lg font-black text-go-foreground">⬇ Download til Windows</Link>
          <Link to="/priser" className="rounded-lg border-2 border-border px-6 py-3 text-lg font-bold">Se priser</Link>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="bg-card p-8">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 text-xl font-bold">{f.t}</h3>
              <p className="mt-2 text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-black">Hvorfor StageCue?</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead className="text-sm uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2"></th><th>StageCue</th><th>QLab</th><th>Multiplay</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Windows", "✅", "❌", "✅"],
                ["Moderne og vedligeholdt", "✅", "✅", "❌"],
                ["Fodpedal-indlæring", "✅", "➖", "➖"],
                ["Gratis scenemonitors med akkorder", "✅", "❌", "❌"],
                ["Telefon-fjernbetjening", "✅", "➖", "❌"],
              ].map((r) => (
                <tr key={r[0]}>{r.map((c, i) => <td key={i} className={i === 0 ? "py-3 font-semibold" : "py-3"}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="rounded-2xl border-2 border-go p-10 text-center">
          <h2 className="text-3xl font-black">Klar til næste show?</h2>
          <p className="mt-3 text-muted-foreground">Pult-licens fra 79 kr./md. Scenemonitors til bandet er altid gratis.</p>
          <Link to="/priser" className="mt-6 inline-block rounded-lg bg-go px-6 py-3 font-black text-go-foreground">Vælg licens</Link>
        </div>
      </section>
    </SiteShell>
  );
}
