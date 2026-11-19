import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, meta } from "@/components/site/SiteShell";

export const Route = createFileRoute("/vilkaar")({
  head: () => meta("Vilkår og licensaftale – StageCue", "Brugervilkår, licensaftale (EULA), refusion og ansvarsbegrænsning for StageCue."),
  component: () => (
    <SiteShell>
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 leading-relaxed">
        <h1 className="text-3xl font-black">Vilkår og licensaftale</h1>
        <p className="text-sm text-muted-foreground">Senest opdateret: november 2026</p>
        <h2 className="text-xl font-bold">1. Licens</h2>
        <p>En Pro-licens er personlig og må være aktiv på maks. 3 pult-enheder ad gangen. Scenemonitorer er altid gratis og ubegrænsede.</p>
        <h2 className="text-xl font-bold">2. Prøveperiode og refusion</h2>
        <p>Pro kan prøves gratis i 7 dage. Køb kan refunderes inden for 14 dage.</p>
        <h2 className="text-xl font-bold">3. Ansvar ved liveshows</h2>
        <p>StageCue er bygget til stabil live-brug, men leveres "som den er". Du er selv ansvarlig for at teste dit show og have en backup. StageCue hæfter ikke for tab som følge af afbrudte forestillinger.</p>
        <h2 className="text-xl font-bold">4. Installation på Windows</h2>
        <p>Ved installation accepterer du disse vilkår. Programmet kan bede om adgang til lokalt netværk (firewall) til scenemonitorer samt MIDI- og lyddrivere. Intet installeres uden din bekræftelse.</p>
        <h2 className="text-xl font-bold">5. Ophavsret</h2>
        <p>StageCue og al kildekode tilhører StageCue. Nævnte produktnavn fra andre producenter tilhører deres respektive ejere.</p>
      </article>
    </SiteShell>
  ),
});
