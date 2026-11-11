import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => { throw redirect({ to: "/hub" }); },
  head: () => ({
    meta: [
      { title: "StageCue Control – Live show control" },
      { name: "description", content: "Cue- og show control til live koncerter: lyd, MIDI, fades, GO-knap og setlister." },
      { property: "og:title", content: "StageCue Control" },
      { property: "og:description", content: "Cue- og show control til live koncerter med Web MIDI og flere lydudgange." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
