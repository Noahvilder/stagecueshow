import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

const URL = "https://stagecueshow.com/midi-pedal-guide";
const TITLE = "Fire Cues with a MIDI Foot Pedal — StageCue Guide";
const DESC = "Step-by-step: connect a USB MIDI foot pedal or controller to StageCue on Windows and trigger GO, stop and backing tracks hands-free on stage.";

export const Route = createFileRoute("/midi-pedal-guide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: () => <SiteShell><Page /></SiteShell>,
});

function Page() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-4xl font-black sm:text-5xl">Fire cues with a MIDI foot pedal</h1>
      <p className="mt-6 text-lg text-muted-foreground">Musicians often need to start backing tracks, clicks or lights without touching a laptop. With StageCue you can map any USB MIDI pedal or controller to GO in under a minute.</p>
      <h2 className="mt-12 text-2xl font-bold">What you need</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
        <li>A Windows 10/11 PC with StageCue installed</li>
        <li>Any USB MIDI foot pedal or controller (or a MIDI interface for 5-pin pedals)</li>
      </ul>
      <h2 className="mt-12 text-2xl font-bold">Steps</h2>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-foreground">
        <li>Plug in the pedal before opening StageCue.</li>
        <li>Open the MIDI Controller window in the console.</li>
        <li>Click <b>Learn</b> next to GO, then press the pedal. StageCue saves the note or CC it receives.</li>
        <li>Repeat for Stop or Back if your pedal has more buttons.</li>
        <li>Use the MIDI Watcher window to check that each press arrives.</li>
        <li>Press the pedal — the selected cue fires.</li>
      </ol>
      <h2 className="mt-12 text-2xl font-bold">Tips</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
        <li>Click a cue in the list to arm it — the next GO fires that cue.</li>
        <li>Share the QR code so the band sees the next cue on their phones.</li>
      </ul>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/download" className="rounded-lg bg-go px-6 py-3 font-black text-go-foreground">⬇ Download StageCue</Link>
        <Link to="/qlab-alternative-windows" className="rounded-lg border border-border px-6 py-3 font-bold">QLab alternative for Windows</Link>
      </div>
    </article>
  );
}
