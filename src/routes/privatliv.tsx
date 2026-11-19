import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, meta } from "@/components/site/SiteShell";

const H = ({ children }: { children: React.ReactNode }) => <h2 className="pt-4 text-xl font-bold">{children}</h2>;

export const Route = createFileRoute("/privatliv")({
  head: () => meta("Privatlivspolitik – StageCue", "Hvilke data StageCue gemmer, hvorfor, hvem der modtager dem, og hvordan du får dem slettet (GDPR)."),
  component: () => (
    <SiteShell>
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 leading-relaxed">
        <h1 className="text-3xl font-black">Privatlivspolitik</h1>
        <p className="text-sm text-muted-foreground">Senest opdateret: 19. november 2026</p>

        <H>1. Konto og login</H>
        <ul className="list-disc space-y-1 pl-6">
          <li>Alle – både teknikere og musikere – skal have en konto for at bruge pulten og scenemonitoren.</li>
          <li>Vi gemmer din email og en krypteret adgangskode. Logger du ind med Google, modtager vi din email og dit navn fra Google.</li>
          <li>Ved "Glemt adgangskode" sender vi en email med et nulstillingslink til din adresse.</li>
          <li>Vi gemmer, hvornår du accepterede vilkår og privatlivspolitik.</li>
        </ul>

        <H>2. Shows og invitationer</H>
        <ul className="list-disc space-y-1 pl-6">
          <li>Show-opsætning (cues, cue-numre, stikord, noter, tabs, monitorprofiler, navne på ind-/udgange) gemmes på din konto, når du gemmer i skyen.</li>
          <li>Inviterer du en musiker til et show, gemmer vi musikerens email sammen med showet. Musikeren ser kun showets navn og scenemonitoren – aldrig din konto.</li>
          <li>Pulten gemmer sin aktuelle forbindelseskode, så dine egne enheder og inviterede kan koble på automatisk.</li>
        </ul>

        <H>3. Lydfiler og data på din enhed</H>
        <ul className="list-disc space-y-1 pl-6">
          <li>Lydfiler bliver på din computer og sendes kun direkte mellem din pult og telefonerne i showet. De uploades aldrig til os.</li>
          <li>På din enhed gemmer vi indstillinger (sprog, tema, visning, genveje), et anonymt enheds-ID og en sikkerhedskopi af hvor du var i showet, så det kan genoptages efter et nedbrud.</li>
          <li>Scenemonitoren gemmer den seneste setliste, stikord og tabs lokalt, så skærmen ikke bliver tom ved Wi-Fi-udfald.</li>
          <li>Eksporterede <code>.stagecue</code>-filer ligger kun, hvor du selv gemmer dem.</li>
        </ul>

        <H>4. Licens og enheder</H>
        <p>Vi gemmer din licenstype, prøveperiodens start og et anonymt enheds-ID for hver pult-enhed (maks. 3 aktive). Det bruges til at håndhæve licensen og forhindre misbrug af prøveperioden – ikke til at spore dig.</p>

        <H>5. Supportsager og forslag</H>
        <p>Når du opretter en supportsag eller et forslag, gemmer vi type, emne, beskrivelse, sagsnummer og den email, du oplyser, så vi kan svare dig.</p>

        <H>6. Besøgsstatistik</H>
        <p>Vi bruger Lovables besøgsstatistik på hjemmesiden. Den bruger ingen cookies, gemmer intet på din enhed, beholder ikke IP-adresser og identificerer ikke besøgende. Den registrerer hvilke sider der besøges, hvor besøgende kom fra, land, browser, styresystem og enhedstype, hvor længe man bliver, hvor hurtigt siderne indlæses, fejl samt hvilke knapper og links der klikkes på. Det registreres for alle besøgende. Detaljerede data gemmes i 90 dage og daglige opsummeringer i et år. Lovable indsamler disse data for os. <a className="underline" href="https://lovable.dev/privacy" target="_blank" rel="noreferrer">Lovables privatlivspolitik</a> forklarer, hvordan de håndteres.</p>

        <H>7. Hvem modtager data</H>
        <ul className="list-disc space-y-1 pl-6">
          <li>Vores hosting- og databaseudbyder (Lovable Cloud), som opbevarer konto-, show- og supportdata.</li>
          <li>Google, hvis du vælger at logge ind med Google.</li>
          <li>Forbindelsen mellem pult og telefoner etableres via en formidlingstjeneste (PeerJS); selve showdata og lyd sendes direkte mellem enhederne.</li>
        </ul>

        <H>8. Hvad vi ikke gør</H>
        <p>Vi sælger ikke data, bruger ikke reklame-cookies og viser ingen reklamer.</p>

        <H>9. Dine rettigheder (GDPR)</H>
        <p>Du kan til enhver tid se, rette, eksportere og slette dine data. Under "Konto" findes knappen "Slet min konto", som permanent fjerner konto, shows, invitationer og licensdata. Spørgsmål kan sendes via supportsiden.</p>

        <H>10. Opbevaring</H>
        <p>Data gemmes, så længe du har en konto, og slettes, når kontoen slettes. Supportsager kan gemmes op til 2 år af hensyn til fejlrettelse.</p>
      </article>
    </SiteShell>
  ),
});
