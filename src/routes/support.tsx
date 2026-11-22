import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, meta } from "@/components/site/SiteShell";
import { FeedbackForm } from "@/components/site/FeedbackForm";

export const Route = createFileRoute("/support")({
  head: () => meta("Support og FAQ – StageCue", "Svar på spørgsmål om lydkort, MIDI-controllere, lysstyring, offline-brug og licenser – og kontakt til StageCue support."),
  component: Support,
});

const FAQ = [
  ["Virker min MIDI controller?", "Ja. Alle USB-MIDI controllere virker uden ekstra software. Vælg 'Lær GO' og tryk på en knap på din controller."],
  ["Kan jeg sende lyd til flere udgange?", "Ja. Hvert lyd-cue kan have sin egen udgang – fx VoiceMeeter, et lydkort eller in-ears."],
  ["Hvordan styrer jeg lys?", "Lav et MIDI-cue der sender noder eller CC til dit lysprogram eller din lyspult. Alt der kan modtage MIDI, kan styres – uden ekstra software i desktop-versionen."],
  ["Kræver det internet under showet?", "Desktop-versionen kører helt offline. Telefoner og monitorer forbindes over lokal Wi-Fi."],
  ["Skal bandet betale?", "Nej. Scenemonitorer med lyrics, akkorder og egne noter er altid gratis og kræver intet login."],
  ["Hvor mange computere må jeg bruge?", "Op til 3 pult-computere pr. licens. Du kan fjerne gamle computere under Konto."],
];

function Support() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-4xl font-black sm:text-5xl">StageCue support og hjælp</h1>
        <h2 className="mt-12 text-xl font-bold">Ofte stillede spørgsmål</h2>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-4">
              <summary className="cursor-pointer font-semibold">{q}</summary>
              <p className="mt-2 text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
        <h2 className="mt-12 text-xl font-bold">Fejlmeld, foreslå en ændring eller få hjælp</h2>
        <div id="ticket"><FeedbackForm /></div>
        <h2 className="mt-12 text-xl font-bold">Kontakt</h2>
        <p className="mt-2 text-muted-foreground">Skriv til <a href="mailto:support@stagecue.app" className="font-semibold text-go underline">support@stagecue.app</a> – vi svarer typisk inden for 24 timer.</p>
      </section>
    </SiteShell>
  );
}
