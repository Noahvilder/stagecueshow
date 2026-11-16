import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, meta } from "@/components/site/SiteShell";

export const Route = createFileRoute("/download")({
  head: () => meta("Download StageCue til Windows", "Hent StageCue til Windows 10/11. Systemkrav, versionshistorik og kom-godt-i-gang guide."),
  component: Download,
});

function Download() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-4 py-20">
        <h1 className="text-4xl font-black sm:text-5xl">Download StageCue</h1>
        <div className="mt-10 rounded-2xl border-2 border-go bg-card p-8">
          <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Windows 10/11 · 64-bit</div>
          <div className="mt-1 text-2xl font-black">StageCue-Setup.exe · v1.0.0</div>
          <button disabled className="mt-6 rounded-lg bg-go px-6 py-3 text-lg font-black text-go-foreground opacity-50">⬇ Desktop-versionen kommer snart</button>
          <p className="mt-4 text-sm text-muted-foreground">Indtil da kan du bruge pulten direkte i Chrome eller Edge: <Link to="/hub" className="underline">Åbn web-pulten</Link></p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold">Systemkrav</h2>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              <li>Windows 10 eller 11 (64-bit)</li><li>4 GB RAM (8 GB anbefales)</li><li>USB-MIDI eller MIDI-interface (valgfrit)</li><li>Wi-Fi til telefon og scenemonitorer</li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-bold">Kom godt i gang</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Installér og aktivér med din licensnøgle</li><li>Tilslut pedal og lær GO-knappen</li><li>Del QR-koden med bandet</li>
            </ol>
          </div>
        </div>

        <h2 className="mt-12 text-xl font-bold">Versionshistorik</h2>
        <div className="mt-3 rounded-xl border border-border p-4">
          <div className="font-bold">v1.0.0 <span className="text-sm font-normal text-muted-foreground">· første udgivelse</span></div>
          <p className="mt-1 text-sm text-muted-foreground">Lyd-, MIDI-, fade-, gruppe- og memo-cues · fodpedaler · scenemonitors med akkorder · telefon-fjernbetjening.</p>
        </div>
      </section>
    </SiteShell>
  );
}
