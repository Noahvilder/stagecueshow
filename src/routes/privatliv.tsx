import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, meta } from "@/components/site/SiteShell";

export const Route = createFileRoute("/privatliv")({
  head: () => meta("Privatlivspolitik – StageCue", "Hvilke data StageCue gemmer, hvorfor, og hvordan du får dem slettet (GDPR)."),
  component: () => (
    <SiteShell>
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 leading-relaxed">
        <h1 className="text-3xl font-black">Privatlivspolitik</h1>
        <p className="text-sm text-muted-foreground">Senest opdateret: november 2026</p>
        <h2 className="text-xl font-bold">Hvad vi gemmer</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Din email og en krypteret adgangskode (til login).</li>
          <li>Licensstatus og et anonymt enheds-ID (maks. 3 pult-enheder).</li>
          <li>Show-opsætning (cues, noter) når du gemmer i skyen. Lydfiler forlader aldrig din computer.</li>
        </ul>
        <h2 className="text-xl font-bold">Hvad vi ikke gør</h2>
        <p>Vi sælger ikke data, bruger ikke reklame-cookies og sporer ikke scenemonitorer. Musikere på scenen behøver ingen konto.</p>
        <h2 className="text-xl font-bold">Dine rettigheder (GDPR)</h2>
        <p>Du kan til enhver tid se, rette og slette dine data. Under "Konto" findes knappen "Slet min konto", som fjerner alt permanent. Spørgsmål kan sendes via supportsiden.</p>
        <h2 className="text-xl font-bold">Opbevaring</h2>
        <p>Data opbevares hos en europæisk/sikker hostingudbyder og slettes, når kontoen slettes.</p>
      </article>
    </SiteShell>
  ),
});
