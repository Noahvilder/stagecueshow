import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

const URL = "https://stagecueshow.com/qlab-alternative-windows";
const TITLE = "QLab Alternative for Windows — StageCue";
const DESC = "Looking for QLab on Windows? StageCue is a cue-based show control app for Windows 10/11: audio cues, MIDI, GO button and stage monitors on phones.";

export const Route = createFileRoute("/qlab-alternative-windows")({
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
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "StageCue",
        operatingSystem: "Windows 10, Windows 11",
        applicationCategory: "MultimediaApplication",
        offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" },
        url: "https://stagecueshow.com/",
      }),
    }],
  }),
  component: () => <SiteShell><Page /></SiteShell>,
});

const rows: [string, string, string][] = [
  ["Runs on", "Windows 10/11", "macOS only"],
  ["Price", "Free plan, Pro from 79 DKK/month", "From $399 per license"],
  ["Audio cues with fades", "Yes", "Yes"],
  ["MIDI in/out", "Yes", "Yes"],
  ["Stage monitors on phones (lyrics, notes, next cue)", "Built in, via QR code", "Not built in"],
  ["Click track generator", "Built in", "Not built in"],
];

function Page() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-4xl font-black sm:text-5xl">A QLab alternative for Windows</h1>
      <p className="mt-6 text-lg text-muted-foreground">QLab is a popular cue-based playback tool for theatre and live shows, but it only runs on Mac. StageCue gives Windows users the same way of working: build a cue list, press GO, and run the show — plus stage monitors for the band on their own phones.</p>
      <h2 className="mt-12 text-2xl font-bold">Quick comparison</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted"><tr><th className="p-3"></th><th className="p-3">StageCue</th><th className="p-3">QLab</th></tr></thead>
          <tbody>{rows.map(([a, b, c]) => <tr key={a} className="border-t border-border"><td className="p-3 font-medium">{a}</td><td className="p-3">{b}</td><td className="p-3 text-muted-foreground">{c}</td></tr>)}</tbody>
        </table>
      </div>
      <h2 className="mt-12 text-2xl font-bold">Who it is for</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
        <li>Schools and amateur theatres that have Windows PCs</li>
        <li>Bands running backing tracks, clicks and MIDI from one laptop</li>
        <li>Sound techs who want a simple GO button and a MIDI foot pedal</li>
      </ul>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/download" className="rounded-lg bg-go px-6 py-3 font-black text-go-foreground">⬇ Download free for Windows</Link>
        <Link to="/midi-pedal-guide" className="rounded-lg border border-border px-6 py-3 font-bold">MIDI pedal guide</Link>
      </div>
      <p className="mt-16 text-xs text-muted-foreground">QLab® is a registered trademark of Figure 53, LLC. StageCue is an independent product and is not affiliated with, sponsored or endorsed by Figure 53, LLC. Prices as listed on the vendor's website; check there for current pricing.</p>
    </article>
  );
}
