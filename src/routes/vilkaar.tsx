import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, meta } from "@/components/site/SiteShell";

const H = ({ children }: { children: React.ReactNode }) => <h2 className="pt-4 text-xl font-bold">{children}</h2>;

export const Route = createFileRoute("/vilkaar")({
  head: () => meta("Vilkår og licensaftale – StageCue", "Brugervilkår, licensaftale (EULA), priser, refusion, invitationer, redundans og ansvarsbegrænsning for StageCue."),
  component: () => (
    <SiteShell>
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 leading-relaxed">
        <h1 className="text-3xl font-black">Vilkår og licensaftale</h1>
        <p className="text-sm text-muted-foreground">Senest opdateret: 25. november 2026</p>

        <H>1. Konto</H>
        <p>Man skal have en personlig konto for at bruge pulten og scenemonitoren. Du er ansvarlig for at holde dit login hemmeligt og må ikke dele din konto med andre.</p>

        <H>2. Gratis og Pro</H>
        <p>StageCue kan bruges gratis med begrænsede funktioner. Pro låser bl.a. op for flere lydudgange (op til 32), MIDI til flere modtagere, gruppe-cues, ubegrænsede monitorer, PFL og backup-pc (Hot-Standby). Den aktuelle opdeling og pris står på prissiden.</p>

        <H>3. Licens og enheder</H>
        <p>En Pro-licens er personlig og må være aktiv på maks. 3 pult-enheder ad gangen. Du kan selv frigøre enheder under "Konto". Scenemonitorer er altid gratis.</p>

        <H>4. Betaling, prøveperiode og refusion</H>
        <ul className="list-disc space-y-1 pl-6">
          <li>Pro kan købes månedligt, årligt eller som engangskøb (livstidslicens).</li>
          <li>Abonnementer fornyes automatisk og kan opsiges når som helst med virkning fra næste periode.</li>
          <li>Pro kan prøves gratis i 7 dage én gang pr. person og enhed. Forsøg på at omgå dette (fx nye konti) kan føre til lukning af kontoen.</li>
          <li>Køb kan refunderes inden for 14 dage.</li>
          <li>Udløber Pro, fortsætter programmet som gratis version. Dine shows slettes ikke.</li>
        </ul>

        <H>5. Invitationer og deling</H>
        <p>Som show-ejer kan du invitere musikere via email. De får kun adgang til scenemonitoren for det pågældende show og kan ikke styre afviklingen. Du er ansvarlig for, hvem du inviterer, og for at du har ret til at dele indholdet (fx tekster, noder og tabs).</p>

        <H>6. Dit indhold</H>
        <p>Shows, lydfiler, noter og tabs tilhører dig. Du er selv ansvarlig for at have rettigheder til musik og materiale, du bruger. Lydfiler bliver på din egen computer.</p>

        <H>7. Redundans og ansvar ved liveshows</H>
        <p>StageCue har indbyggede sikkerhedsfunktioner (dobbelt-GO-spærre, nødstop, genoptagelse efter nedbrud, lokal lagring på monitorer og backup-pc). De mindsker risikoen, men kan ikke garantere en fejlfri forestilling. StageCue leveres "som den er". Du er selv ansvarlig for at teste dit show, din hardware og dit netværk og for at have en plan B. StageCue hæfter ikke for tab som følge af afbrudte eller forstyrrede forestillinger.</p>
        <p>Dette gælder også afvikling med ekstern lyd-, lys- og scenehardware, herunder DMX via Art-Net/sACN, MIDI, OSC og MTC/LTC-tidskode. Du skal kontrollere patch, kanalværdier, lydniveauer, tidskode og udstyrets reaktion ved signaltab før brug. StageCue er ikke et sikkerhedssystem og må ikke erstatte hardware-nødstop eller andre påkrævede sikkerhedsforanstaltninger. Ansvarsbegrænsningerne gælder kun i det omfang, gældende lov tillader det, og begrænser ikke dine ufravigelige rettigheder.</p>

        <H>8. Installation på Windows</H>
        <p>Ved installation accepterer du disse vilkår. Programmet kan bede om adgang til lokalt netværk (firewall) til scenemonitorer, OSC og DMX via Art-Net/sACN, herunder afsendelse af UDP-pakker og broadcast. Det kan også bede om adgang til lydkort (inkl. ASIO), MIDI-enheder og MIDI-controllere til lyd og MTC/LTC-tidskode. Du vælger selv udgange og forbindelser i programmet.</p>
        <p>Windows-versioner med indbygget offline-pult kan oprette, gemme og afvikle lokale shows uden internet og uden login i offline-tilstand. Webversionen og ældre Windows-versioner, der indlæser hjemmesiden, kræver internet. Konto, cloud-gemning, online-invitationer og download af opdateringer kræver internet. Kommunikation med lokal hardware og lokale scenemonitorer kan fortsat kræve et fungerende lokalt netværk.</p>

        <H>9. Opdateringer</H>
        <p>Vi kan løbende opdatere, ændre eller fjerne funktioner. Væsentlige ændringer i disse vilkår varsles på siden eller via email.</p>

        <H>10. Misbrug</H>
        <p>Du må ikke videresælge, distribuere, dekompilere eller omgå licens- og enhedsbegrænsninger. Ved misbrug kan kontoen lukkes.</p>

        <H>11. Ophavsret</H>
        <p>StageCue, navn, logo og kildekode tilhører StageCue. Nævnte produktnavne fra andre producenter tilhører deres respektive ejere, og StageCue er ikke tilknyttet dem.</p>

        <H>12. Tredjeparts-teknologi</H>
        <p>StageCue til Windows bruger ASIO Technology by Steinberg Media Technologies GmbH. ASIO is a trademark of Steinberg Media Technologies GmbH, registered in Europe and other countries. Desuden bruges open source-komponenter (Tauri, cpal, PeerJS) under deres egne licenser.</p>
        <p>Art-Net™ Designed by and Copyright Artistic Licence Engineering Ltd. <a className="underline" href="https://art-net.org.uk/" target="_blank" rel="noreferrer">Art-Net-protokollen</a> bruges til netværksbaseret DMX-lysudgang.</p>

        <H>13. Lovvalg</H>
        <p>Vilkårene er underlagt dansk ret. Kontakt os via supportsiden ved spørgsmål eller klager.</p>
      </article>
    </SiteShell>
  ),
});
