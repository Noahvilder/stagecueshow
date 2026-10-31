import { createFileRoute } from "@tanstack/react-router";
import { ShowControl } from "@/components/show/ShowControl";

export const Route = createFileRoute("/")({
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
  component: ShowControl,
});
