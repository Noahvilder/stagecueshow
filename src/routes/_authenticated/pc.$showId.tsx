import { createFileRoute } from "@tanstack/react-router";
import { ShowControl } from "@/components/show/ShowControl";
import { PultDeviceGate } from "@/components/account/PultDeviceGate";

export const Route = createFileRoute("/_authenticated/pc/$showId")({
  head: () => ({
    meta: [
      { title: "Pult – StageCue Control" },
      { name: "description", content: "Fuld show control: GO, lyd, MIDI og MIDI-controllere." },
      { property: "og:title", content: "Pult – StageCue Control" },
      { property: "og:description", content: "Fuld show control til live koncerter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PcPage,
});

function PcPage() {
  const { showId } = Route.useParams();
  return <PultDeviceGate><ShowControl key={showId} showId={showId} /></PultDeviceGate>;
}
