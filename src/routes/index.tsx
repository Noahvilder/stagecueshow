import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { SiteShell, meta } from "@/components/site/SiteShell";
import { PRICES, useLang, useT } from "@/lib/site/i18n";

export const Route = createFileRoute("/")({
  head: () => meta("StageCue – Professional show control for Windows", "Cue-based show control for Windows: an easy, powerful cue list, plug & play MIDI controllers, multi-output audio and free wireless stage monitors for the whole band."),
  component: Landing,
});

type L = { en: string; da: string; de: string; fr?: string; es?: string; sv?: string; no?: string };

const ENGINE: { k: string; t: L; d: L }[] = [
  { k: "EASY", t: { en: "Clear from day one", da: "Overskuelig fra dag ét", de: "Klar ab dem ersten Tag", fr: "Clair dès le premier jour", es: "Claro desde el primer día", sv: "Tydligt från dag ett", no: "Tydelig fra første dag" }, d: { en: "Simple layout for beginners, advanced tools when you need them. Search every function and get help on every button.", da: "Simpel visning for nye brugere, avancerede værktøjer når du har brug for dem. Søg i alle funktioner og få hjælp til hver knap.", de: "Einfache Ansicht für Einsteiger, Profi-Werkzeuge bei Bedarf. Alle Funktionen durchsuchen, Hilfe zu jedem Knopf.", fr: "Interface simple pour les débutants, outils avancés quand vous en avez besoin. Recherchez n'importe quelle fonction et obtenez de l'aide sur chaque bouton.", es: "Diseño simple para principiantes, herramientas avanzadas cuando las necesitas. Busca cualquier función y obtén ayuda en cada botón.", sv: "Enkel layout för nybörjare, avancerade verktyg när du behöver dem. Sök bland alla funktioner och få hjälp för varje knapp.", no: "Enkelt oppsett for nybegynnere, avanserte verktøy når du trenger det. Søk i alle funksjoner og få hjelp på hver knapp." } },
  { k: "MIDI", t: { en: "Plug & play MIDI controllers", da: "Plug & play MIDI-controllere", de: "Plug & Play MIDI-Controller", fr: "Contrôleurs MIDI plug & play", es: "Controladores MIDI plug & play", sv: "Plug & play-MIDI-kontroller", no: "Plug & play-MIDI-kontrollere" }, d: { en: "Any USB-MIDI pedal, keyboard or pad. Click Learn, tap your hardware — done. No extra software needed.", da: "Enhver USB-MIDI pedal, keyboard eller pad. Klik Lær, tryk på din hardware – færdig. Intet ekstra software.", de: "Jedes USB-MIDI-Pedal, Keyboard oder Pad. Lernen klicken, Hardware antippen – fertig. Keine Zusatzsoftware.", fr: "N'importe quelle pédale, clavier ou pad USB-MIDI. Cliquez sur Learn, touchez votre matériel — c'est fait. Aucun logiciel supplémentaire requis.", es: "Cualquier pedal, teclado o pad USB-MIDI. Haz clic en Learn, pulsa tu hardware y listo. Sin software adicional.", sv: "Vilken USB-MIDI-pedal, keyboard eller pad som helst. Klicka på Learn, tryck på din hårdvara — klart. Ingen extra programvara behövs.", no: "Hvilken som helst USB-MIDI-pedal, keyboard eller pad. Klikk Learn, trykk på maskinvaren din — ferdig. Ingen ekstra programvare nødvendig." } },
  { k: "OUT", t: { en: "Built-in MIDI & audio routing", da: "Indbygget MIDI- og lydrouting", de: "Integriertes MIDI- & Audio-Routing", fr: "Routage audio et MIDI intégré", es: "Enrutamiento de audio y MIDI integrado", sv: "Inbyggd MIDI- och ljudrouting", no: "Innebygd MIDI- og lydruting" }, d: { en: "Send notes, CC and program changes to synths, effects and lighting. Route every audio cue to its own output.", da: "Send noder, CC og program changes til synths, effekter og lys. Send hvert lyd-cue til sin egen udgang.", de: "Sende Noten, CC und Program Changes an Synths, Effekte und Licht. Jeder Audio-Cue auf eigenen Ausgang.", fr: "Envoyez des notes, des CC et des changements de programme vers vos synthés, effets et éclairages. Routez chaque cue audio vers sa propre sortie.", es: "Envía notas, CC y cambios de programa a sintes, efectos e iluminación. Enruta cada cue de audio a su propia salida.", sv: "Skicka noter, CC och programändringar till syntar, effekter och ljus. Routa varje ljud-cue till sin egen utgång.", no: "Send noter, CC og programendringer til synther, effekter og lys. Rut hvert lyd-cue til sin egen utgang." } },
];

const ARENA: { k: string; t: L; d: L }[] = [
  { k: "📱", t: { en: "Free wireless stage monitors", da: "Gratis trådløse scenemonitorer", de: "Kostenlose kabellose Bühnenmonitore", fr: "Moniteurs de scène sans fil gratuits", es: "Monitores de escenario inalámbricos gratuitos", sv: "Kostnadsfria trådlösa scenmonitorer", no: "Gratis trådløse scenemonitorer" }, d: { en: "The band scans a QR code and gets lyrics, chords, tabs and personal notes. No login, no cost.", da: "Bandet scanner en QR-kode og får tekst, akkorder, tabs og egne noter. Intet login, ingen pris.", de: "Die Band scannt einen QR-Code und bekommt Texte, Akkorde, Tabs und eigene Notizen. Kein Login, kostenlos.", fr: "Le groupe scanne un code QR et accède aux paroles, accords, tablatures et notes personnelles. Sans connexion, sans frais.", es: "El grupo escanea un código QR y accede a letras, acordes, tablaturas y notas personales. Sin registro, sin coste.", sv: "Bandet skannar en QR-kod och får texter, ackord, tabbar och personliga anteckningar. Ingen inloggning, helt gratis.", no: "Bandet skanner en QR-kode og får tekster, akkorder, tabs og personlige notater. Ingen innlogging, helt gratis." } },
  { k: "🔒", t: { en: "Show lock & panic", da: "Show lock & panik", de: "Show-Lock & Panik", fr: "Verrouillage de spectacle et bouton panique", es: "Bloqueo de show y botón de pánico", sv: "Showlås och panikknapp", no: "Showlås og panikk-knapp" }, d: { en: "Lock editing during the show. One key fades everything out if something goes wrong.", da: "Lås redigering under showet. Én tast fader alt ud, hvis noget går galt.", de: "Bearbeitung während der Show sperren. Eine Taste blendet alles aus, wenn etwas schiefgeht.", fr: "Verrouillez l'édition pendant le spectacle. Une seule touche applique un fondu général si quelque chose tourne mal.", es: "Bloquea la edición durante el espectáculo. Una sola tecla hace fade out de todo si algo sale mal.", sv: "Lås redigering under showen. En enda tangent tonar ut allt om något går fel.", no: "Lås redigering under showet. Én enkelt tast dimmer ut alt hvis noe går galt." } },
  { k: "📡", t: { en: "100% offline on stage", da: "100% offline på scenen", de: "100% offline auf der Bühne", fr: "100 % hors ligne sur scène", es: "100 % offline en el escenario", sv: "100 % offline på scen", no: "100 % offline på scenen" }, d: { en: "The desktop app runs locally. Phones connect over your own Wi-Fi — no internet required.", da: "Desktop-appen kører lokalt. Telefoner forbindes over jeres eget Wi-Fi – intet internet nødvendigt.", de: "Die Desktop-App läuft lokal. Handys verbinden sich über euer eigenes WLAN – kein Internet nötig.", fr: "L'application de bureau fonctionne en local. Les téléphones se connectent via votre propre Wi-Fi — aucune connexion Internet requise.", es: "La aplicación de escritorio funciona en local. Los teléfonos se conectan a través de tu propia red Wi-Fi; no se necesita internet.", sv: "Skrivbordsappen körs lokalt. Telefoner ansluter via ditt eget Wi-Fi — inget internet behövs.", no: "Skrivebordsappen kjører lokalt. Telefoner kobler seg til via ditt eget Wi-Fi — ingen internett nødvendig." } },
];


const ALL_FEATURES: { g: L; items: L[] }[] = [
  { g: { en: 'Playback', da: 'Afvikling', de: 'Wiedergabe', fr: 'Lecture', es: 'Reproducción', sv: 'Uppspelning', no: 'Avspilling' }, items: [
    { en: 'GO / Panic / Hard stop', da: 'GO / Panik / Hårdt stop', de: 'GO / Panik / Harter Stopp', fr: 'GO / Panique / Arrêt net', es: 'GO / Pánico / Parada total', sv: 'GO / Panik / Hårt stopp', no: 'GO / Panikk / Hard stopp' },
    { en: 'Audio, MIDI, fade, stop, memo & group cues', da: 'Lyd-, MIDI-, fade-, stop-, memo- og gruppecues', de: 'Audio-, MIDI-, Fade-, Stopp-, Memo- & Gruppen-Cues', fr: 'Cues audio, MIDI, fondu, stop, mémo & groupe', es: 'Cues de audio, MIDI, fundido, stop, memo y grupo', sv: 'Ljud-, MIDI-, fade-, stopp-, memo- & gruppcues', no: 'Lyd-, MIDI-, fade-, stopp-, memo- og gruppecues' },
    { en: 'Group cues with per-cue delay after GO', da: 'Gruppecues med forsinkelse pr. cue efter GO', de: 'Gruppen-Cues mit Verzögerung pro Cue nach GO', fr: 'Groupes avec délai par cue après GO', es: 'Grupos con retardo por cue tras GO', sv: 'Gruppcues med fördröjning per cue efter GO', no: 'Gruppecues med forsinkelse per cue etter GO' },
    { en: 'Active list with live pre-wait countdown', da: 'Aktiv-liste med live pre-wait-nedtælling', de: 'Aktiv-Liste mit Live-Pre-Wait-Countdown', fr: 'Liste active avec décompte pre-wait', es: 'Lista activa con cuenta atrás pre-wait', sv: 'Aktivlista med live pre-wait-nedräkning', no: 'Aktivliste med live pre-wait-nedtelling' },
    { en: 'Click a cue to arm it for GO', da: 'Klik på et cue for at gøre det klar til GO', de: 'Cue anklicken, um ihn für GO scharf zu schalten', fr: "Cliquer un cue pour l'armer", es: 'Clic en un cue para armarlo', sv: 'Klicka på en cue för att armera den', no: 'Klikk på en cue for å klargjøre den' },
    { en: 'Auto-next / follow', da: 'Auto-næste / følg', de: 'Auto-Weiter / Folgen', fr: 'Enchaînement auto', es: 'Siguiente automático', sv: 'Auto-nästa / följ', no: 'Auto-neste / følg' },
    { en: 'Show lock', da: 'Showlås', de: 'Show-Sperre', fr: 'Verrouillage du show', es: 'Bloqueo de show', sv: 'Showlås', no: 'Showlås' },
    { en: 'Cue numbers, manuscript ref & cue triggers', da: 'Cuenumre, manuskript-ref. og stikord', de: 'Cue-Nummern, Skript-Ref. & Stichworte', fr: 'Numéros, réf. script & repères', es: 'Números, ref. de guion y pies', sv: 'Cuenummer, manusref. & stickord', no: 'Cuenummer, manusref. og stikkord' },
    { en: 'Play time, since last GO or countdown — H:MM:SS or seconds', da: 'Spilletid, siden sidste GO eller nedtælling – T:MM:SS eller sekunder', de: 'Spielzeit, seit letztem GO oder Countdown – H:MM:SS oder Sekunden', fr: 'Durée, depuis dernier GO ou décompte – h:mm:ss ou secondes', es: 'Tiempo, desde último GO o cuenta atrás – h:mm:ss o segundos', sv: 'Speltid, sedan senaste GO eller nedräkning – T:MM:SS eller sekunder', no: 'Spilletid, siden siste GO eller nedtelling – T:MM:SS eller sekunder' },
    { en: 'Colour-coded cues & waveform', da: 'Farvekodede cues og bølgeform', de: 'Farbcodierte Cues & Wellenform', fr: "Cues colorés & forme d'onde", es: 'Cues por colores y forma de onda', sv: 'Färgkodade cues & vågform', no: 'Fargekodede cues og bølgeform' },
  ] },
  { g: { en: 'Audio & MIDI', da: 'Lyd & MIDI', de: 'Audio & MIDI', fr: 'Audio & MIDI', es: 'Audio y MIDI', sv: 'Ljud & MIDI', no: 'Lyd & MIDI' }, items: [
    { en: 'Up to 32-channel output routing', da: 'Op til 32 udgange', de: 'Bis zu 32 Ausgänge', fr: "Jusqu'à 32 sorties", es: 'Hasta 32 salidas', sv: 'Upp till 32 utgångar', no: 'Opptil 32 utganger' },
    { en: 'Pre-fade listen (PFL)', da: 'Forlyt (PFL)', de: 'Vorhören (PFL)', fr: 'Pré-écoute (PFL)', es: 'Preescucha (PFL)', sv: 'Förlyssning (PFL)', no: 'Forlytt (PFL)' },
    { en: 'MIDI notes, CC & program change out', da: 'MIDI-noder, CC og program change ud', de: 'MIDI-Noten, CC & Program Change', fr: 'Notes MIDI, CC & program change', es: 'Notas MIDI, CC y program change', sv: 'MIDI-noter, CC & program change', no: 'MIDI-noter, CC og program change' },
    { en: 'MIDI controller learn', da: 'MIDI-controller indlæring', de: 'MIDI-Controller lernen', fr: 'Apprentissage contrôleur MIDI', es: 'Aprendizaje de controlador MIDI', sv: 'MIDI-kontroller inlärning', no: 'MIDI-kontroller innlæring' },
    { en: 'Live MIDI monitor', da: 'Live MIDI-monitor', de: 'Live-MIDI-Monitor', fr: 'Moniteur MIDI en direct', es: 'Monitor MIDI en vivo', sv: 'Live MIDI-monitor', no: 'Live MIDI-monitor' },
    { en: 'Default settings for new cues, saved in the show', da: 'Standardindstillinger for nye cues, gemt i showet', de: 'Standardwerte für neue Cues, in der Show gespeichert', fr: 'Réglages par défaut des cues, dans le show', es: 'Valores por defecto de cues, guardados en el show', sv: 'Standardvärden för nya cues, sparade i showen', no: 'Standardverdier for nye cues, lagret i showet' },
    { en: 'Click track generator with tempo ramps & voice count-in', da: 'Clicktrack-generator med tempoændringer og stemme-optælling', de: 'Click-Generator mit Tempoverläufen & Stimm-Einzähler', fr: 'Générateur de clic avec rampes & décompte vocal', es: 'Claqueta con rampas de tempo y cuenta por voz', sv: 'Klickgenerator med temporamper & röst-inräkning', no: 'Klikkgenerator med temporamper og stemme-inntelling' },
  ] },
  { g: { en: 'Band & stage', da: 'Band & scene', de: 'Band & Bühne', fr: 'Groupe & scène', es: 'Banda y escenario', sv: 'Band & scen', no: 'Band og scene' }, items: [
    { en: 'Free wireless stage monitors per role (bass, guitar, vocals…)', da: 'Gratis trådløse scenemonitorer pr. rolle (bas, guitar, sang…)', de: 'Kostenlose Bühnenmonitore pro Rolle (Bass, Gitarre, Gesang…)', fr: 'Retours gratuits par rôle (basse, guitare, chant…)', es: 'Monitores gratis por rol (bajo, guitarra, voz…)', sv: 'Gratis scenmonitorer per roll (bas, gitarr, sång…)', no: 'Gratis scenemonitorer per rolle (bass, gitar, vokal…)' },
    { en: 'Memo text stays on screen until the next memo', da: 'Memotekst bliver stående til næste memo', de: 'Memo-Text bleibt bis zum nächsten Memo', fr: "Le mémo reste jusqu'au suivant", es: 'El memo permanece hasta el siguiente', sv: 'Memotext står kvar till nästa memo', no: 'Memotekst blir stående til neste memo' },
    { en: 'Lyrics & chords (ChordPro) with live transpose', da: 'Tekst og akkorder (ChordPro) med live transponering', de: 'Texte & Akkorde (ChordPro) mit Live-Transponierung', fr: 'Paroles & accords (ChordPro) avec transposition', es: 'Letras y acordes (ChordPro) con transposición', sv: 'Text & ackord (ChordPro) med transponering', no: 'Tekst og akkorder (ChordPro) med transponering' },
    { en: 'Pro tabs for 4–8 string bass & guitar', da: 'Professionelle tabs til 4–8 strengs bas og guitar', de: 'Profi-Tabs für 4–8-saitigen Bass & Gitarre', fr: 'Tabs pro pour basse & guitare 4–8 cordes', es: 'Tabs pro para bajo y guitarra de 4–8 cuerdas', sv: 'Proffstabs för 4–8-strängad bas & gitarr', no: 'Proffe tabs for 4–8-strengs bass og gitar' },
    { en: 'Monitors remember recent shows — 1-tap reconnect', da: 'Monitorer husker seneste shows – genforbind med ét tryk', de: 'Monitore merken sich Shows – Neuverbindung per Tipp', fr: 'Les retours mémorisent les shows récents', es: 'Los monitores recuerdan shows recientes', sv: 'Monitorer minns senaste shower', no: 'Monitorer husker siste show' },
    { en: 'Personal monitor notes, auto-scroll & phone remote', da: 'Personlige monitornoter, auto-scroll og telefon-fjernbetjening', de: 'Persönliche Notizen, Auto-Scroll & Handy-Fernbedienung', fr: 'Notes perso, défilement auto & télécommande', es: 'Notas personales, autodesplazamiento y control móvil', sv: 'Egna anteckningar, autoscroll & mobilfjärr', no: 'Egne notater, autoscroll og mobilfjernkontroll' },
  ] },
  { g: { en: 'Workflow', da: 'Arbejdsgang', de: 'Workflow', fr: 'Flux de travail', es: 'Flujo de trabajo', sv: 'Arbetsflöde', no: 'Arbeidsflyt' }, items: [
    { en: 'Free, grid or magnetic window snapping', da: 'Frie, gitter- eller magnetiske vinduer', de: 'Freie, Raster- oder magnetische Fenster', fr: 'Fenêtres libres, grille ou aimantées', es: 'Ventanas libres, con cuadrícula o magnéticas', sv: 'Fria, rutnäts- eller magnetiska fönster', no: 'Frie, rutenett- eller magnetiske vinduer' },
    { en: 'Search songs, cues, numbers & triggers (Ctrl+F)', da: 'Søg i sange, cues, numre og stikord (Ctrl+F)', de: 'Songs, Cues, Nummern & Stichworte suchen (Ctrl+F)', fr: 'Recherche chansons, cues, numéros & repères', es: 'Buscar canciones, cues, números y pies', sv: 'Sök låtar, cues, nummer & stickord', no: 'Søk i sanger, cues, numre og stikkord' },
    { en: 'Reorder songs with one click', da: 'Flyt rækkefølgen af sange med ét klik', de: 'Songreihenfolge per Klick ändern', fr: 'Réordonner les chansons en un clic', es: 'Reordenar canciones con un clic', sv: 'Ändra låtordning med ett klick', no: 'Endre rekkefølge på sanger med ett klikk' },
    { en: 'Save as a file on your PC + autosave every 1–30 min', da: "Gem som fil på pc'en + autogem hvert 1–30 min", de: 'Als Datei speichern + Autospeichern alle 1–30 Min.', fr: 'Fichier local + sauvegarde auto 1–30 min', es: 'Archivo local + autoguardado cada 1–30 min', sv: 'Spara som fil + autospara var 1–30 min', no: 'Lagre som fil + autolagring hvert 1–30 min' },
    { en: 'Simple / advanced layout, columns & hover help', da: 'Simpel / avanceret visning, kolonner og hjælpetekster', de: 'Einfache / erweiterte Ansicht, Spalten & Hilfe', fr: 'Vue simple / avancée, colonnes & aide', es: 'Vista simple / avanzada, columnas y ayuda', sv: 'Enkel / avancerad vy, kolumner & hjälp', no: 'Enkel / avansert visning, kolonner og hjelp' },
    { en: 'Custom keyboard shortcuts & command search', da: 'Egne tastaturgenveje og funktionssøgning', de: 'Eigene Tastenkürzel & Befehlssuche', fr: 'Raccourcis perso & recherche de commandes', es: 'Atajos propios y búsqueda de comandos', sv: 'Egna kortkommandon & kommandosök', no: 'Egne hurtigtaster og kommandosøk' },
    { en: 'Setlist import & .stagecue backup with audio', da: 'Setliste-import og .stagecue-backup med lyd', de: 'Setlisten-Import & .stagecue-Backup mit Audio', fr: 'Import de setlist & sauvegarde .stagecue', es: 'Importar setlist y copia .stagecue con audio', sv: 'Setlistimport & .stagecue-backup med ljud', no: 'Setlisteimport og .stagecue-backup med lyd' },
    { en: 'License codes for schools & organisations', da: 'Licenskoder til skoler og organisationer', de: 'Lizenzcodes für Schulen & Organisationen', fr: 'Codes de licence pour écoles & organisations', es: 'Códigos de licencia para escuelas', sv: 'Licenskoder för skolor & organisationer', no: 'Lisenskoder for skoler og organisasjoner' },
    { en: 'Dark & light theme · 7 languages in site and app', da: 'Mørkt og lyst tema · 7 sprog på siden og i appen', de: 'Dunkles & helles Design · 7 Sprachen', fr: 'Thème sombre & clair · 7 langues', es: 'Tema oscuro y claro · 7 idiomas', sv: 'Mörkt & ljust tema · 7 språk', no: 'Mørkt og lyst tema · 7 språk' },
  ] },
];

function AllFeatures() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <section id="funktioner" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
      <h2 className="text-3xl font-black">{t({ en: "Everything in StageCue", da: "Alle funktioner", de: "Alle Funktionen", fr: "Tout dans StageCue", es: "Todo en StageCue", sv: "Allt i StageCue", no: "Alt i StageCue" })}</h2>
      <div className="relative mt-8 rounded-2xl border border-border bg-card">
        <div className={"grid gap-8 overflow-hidden p-6 transition-[max-height] duration-500 sm:grid-cols-2 lg:grid-cols-4 " + (open ? "max-h-[2000px]" : "max-h-48")}>
          {ALL_FEATURES.map((f) => (
            <div key={f.g.en}>
              <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-go">{t(f.g)}</h3>
              <ul className="space-y-1.5 text-sm">{f.items.map((i) => <li key={i.en}>✓ {t(i)}</li>)}</ul>
            </div>
          ))}
        </div>
        {!open && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 rounded-b-2xl bg-gradient-to-t from-card to-transparent" />}
      </div>
      <div className="mt-4 text-center">
        <button onClick={() => setOpen(!open)} className="rounded-lg border-2 border-border px-6 py-2 font-bold hover:border-go">
          {open ? t({ en: "Show less ⌃", da: "Vis færre ⌃", de: "Weniger ⌃", fr: "Afficher moins ⌃", es: "Mostrar menos ⌃", sv: "Visa mindre ⌃", no: "Vis mindre ⌃" }) : t({ en: "See all features ⌄", da: "Se alle funktioner ⌄", de: "Alle Funktionen ⌄", fr: "Voir toutes les fonctionnalités ⌄", es: "Ver todas las funciones ⌄", sv: "Se alla funktioner ⌄", no: "Se alle funksjoner ⌄" })}
        </button>
      </div>
    </section>
  );
}

const BENEFITS = [ENGINE[0]!, ARENA[0]!, ARENA[2]!];

function Benefits() {
  const t = useT();
  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-20 md:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.k} className="rounded-2xl border border-border bg-card p-6">
            <div className="font-mono text-sm font-black text-go">{b.k}</div>
            <h3 className="mt-3 text-xl font-black">{t(b.t)}</h3>
            <p className="mt-2 text-muted-foreground">{t(b.d)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConsoleMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex h-8 items-center gap-4 border-b border-border px-4 font-mono text-[11px] text-muted-foreground"><span>File</span><span>Edit</span><span>Cues</span><span>Playback</span><span>Windows</span><span className="ml-auto">00:42:17</span></div>
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          {["1    Intro – walk-in", "2    Opener – click", "2.5  Verse light", "3    Chorus FX", "4    Outro fade"].map((r, j) => (
            <div key={r} className={`rounded px-3 py-2 font-mono text-xs sm:text-sm ${j === 1 ? "bg-go text-go-foreground" : "bg-muted text-muted-foreground"}`}>{r}</div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex min-h-24 flex-1 items-center justify-center rounded-xl bg-go text-4xl font-black text-go-foreground">GO</div>
          <div className="rounded-lg bg-muted p-2 text-center font-mono text-xs font-bold text-standby">⏱ GO: "…and the lights go down"</div>
        </div>
      </div>
    </div>
  );
}

const TABS: { l: L; render: () => ReactNode }[] = [
  { l: { en: "Console", da: "Pulten", de: "Pult", fr: "Console", es: "Consola", sv: "Konsol", no: "Konsoll" }, render: () => <ConsoleMock /> },
  { l: { en: "Stage monitor", da: "Scenemonitor", de: "Bühnenmonitor", fr: "Moniteur de scène", es: "Monitor de escenario", sv: "Scenmonitor", no: "Scenemonitor" }, render: () => (
    <div className="mx-auto max-w-xs overflow-hidden rounded-[2rem] border-4 border-border bg-card p-5 font-mono shadow-2xl">
      <div className="text-xs text-muted-foreground">NOW · 2 Opener</div>
      <div className="mt-3 text-lg font-bold">[Em] Here we go [C] again</div>
      <pre className="mt-3 overflow-hidden text-xs text-muted-foreground">G|-----------|{"\n"}D|--2--2--4--|{"\n"}A|--2--2--2--|{"\n"}E|--0--0-----|</pre>
      <div className="mt-4 rounded bg-muted p-2 text-center text-sm font-bold text-standby">⏱ GO: Drums fill</div>
    </div>) },
  { l: { en: "Click & tools", da: "Click & værktøjer", de: "Click & Tools", fr: "Clic & outils", es: "Metrónomo y herramientas", sv: "Klick & verktyg", no: "Klikk og verktøy" }, render: () => (
    <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 text-center"><div className="text-5xl font-black">120</div><div className="text-sm text-muted-foreground">BPM · 4/4 · Moderato</div><div className="mt-4 flex justify-center gap-2">{[0,1,2,3].map((i) => <span key={i} className={`h-3 w-3 rounded-full ${i === 0 ? "bg-standby" : "bg-muted"}`} />)}</div></div>
      <div className="rounded-2xl border border-border bg-card p-4 font-mono text-xs"><div className="font-bold text-go">● Note On C3 · Pedal · 3 B</div><div className="mt-2 text-muted-foreground">CC 64 · Keys · 3 B</div><div className="text-muted-foreground">PC 12 · Helix · 2 B</div></div>
    </div>) },
];

function Tour() {
  const t = useT();
  const [i, setI] = useState(1);
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-3xl font-black">{t({ en: "Take a look", da: "Se den i brug", de: "Ein Blick hinein", fr: "Jeter un œil", es: "Echa un vistazo", sv: "Ta en titt", no: "Ta en titt" })}</h2>
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab, j) => (
          <button key={tab.l.en} onClick={() => setI(j)} className={`rounded-full px-4 py-2 text-sm font-bold ${i === j ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>{t(tab.l)}</button>
        ))}
      </div>
      <div className="mt-8">{TABS[i]!.render()}</div>
    </section>
  );
}

const REDUNDANCY: { k: string; t: L; d: L; pro?: boolean }[] = [
  { k: "01", t: { en: "No accidental double GO", da: "Ingen dobbelt-GO ved et uheld", de: "Kein versehentliches Doppel-GO", fr: "Pas de double GO accidentel", es: "Sin doble GO accidental", sv: "Inget oavsiktligt dubbelt GO", no: "Ingen utilsiktet dobbel-GO" }, d: { en: "A short lock after each GO ignores nervous double presses. Esc fades out smoothly; press twice for an instant stop. Lock the show to stop edits mid-gig.", da: "En kort spærre efter hvert GO ignorerer nervøse dobbelttryk. Esc fader blødt ud; tryk to gange for øjeblikkeligt stop. Lås showet, så intet kan redigeres midt i koncerten.", de: "Eine kurze Sperre nach jedem GO ignoriert nervöse Doppeldrücke. Esc blendet sanft aus; zweimal drücken stoppt sofort. Show sperren gegen Änderungen live.", fr: "Un court verrouillage après chaque GO ignore les doubles appuis involontaires. Échap applique un fondu progressif ; appuyez deux fois pour un arrêt immédiat. Verrouillez le spectacle pour bloquer les modifications en plein concert.", es: "Un breve bloqueo tras cada GO ignora las pulsaciones dobles involuntarias. Esc hace un fade out suave; pulsa dos veces para una parada instantánea. Bloquea el show para evitar ediciones durante el concierto.", sv: "Ett kort lås efter varje GO ignorerar nervösa dubbeltryck. Esc tonar ut mjukt; tryck två gånger för omedelbart stopp. Lås showen för att förhindra ändringar mitt under spelningen.", no: "En kort lås etter hvert GO ignorerer nervøse dobbelttrykk. Esc toner ut mykt; trykk to ganger for umiddelbar stopp. Lås showet for å unngå redigering midt i konserten." } },
  { k: "02", t: { en: "Back in seconds after a crash", da: "Tilbage på sekunder efter et nedbrud", de: "In Sekunden zurück nach einem Absturz", fr: "Opérationnel en quelques secondes après un plantage", es: "Listo en segundos tras un fallo", sv: "Tillbaka på några sekunder efter en krasch", no: "Tilbake på sekunder etter en krasj" }, d: { en: "StageCue remembers exactly where you were. If the PC crashes or loses power, restart and resume from the same cue with one click. Audio lives locally — no internet needed to play.", da: "StageCue husker præcis, hvor du var. Crasher pc'en eller mister den strøm, så genstart og fortsæt fra samme cue med ét klik. Lyden ligger lokalt – intet internet nødvendigt for at spille.", de: "StageCue merkt sich genau, wo du warst. Nach Absturz oder Stromausfall mit einem Klick am selben Cue weitermachen. Audio liegt lokal – kein Internet zum Abspielen nötig.", fr: "StageCue se souvient exactement de l'endroit où vous en étiez. Si le PC plante ou perd l'alimentation, redémarrez et reprenez depuis le même cue en un clic. L'audio est stocké localement — pas besoin d'Internet pour jouer.", es: "StageCue recuerda exactamente dónde estabas. Si el PC se cuelga o se queda sin energía, reinicia y continúa desde el mismo cue con un solo clic. El audio se guarda localmente: no se necesita internet para reproducirlo.", sv: "StageCue kommer ihåg exakt var du var. Om datorn kraschar eller tappar strömmen, starta om och fortsätt från samma cue med ett klick. Ljudet lagras lokalt — inget internet behövs för att spela upp.", no: "StageCue husker nøyaktig hvor du var. Hvis PC-en krasjer eller mister strømmen, starter du på nytt og fortsetter fra samme cue med ett klikk. Lyden ligger lokalt — ikke nødvendig med internett for å spille." } },
  { k: "03", t: { en: "Stage monitors that never go blank", da: "Scenemonitorer der aldrig går i sort", de: "Bühnenmonitore, die nie schwarz werden", fr: "Des moniteurs de scène qui ne deviennent jamais noirs", es: "Monitores de escenario que nunca se quedan en blanco", sv: "Scenmonitorer som aldrig blir tomma", no: "Scenemonitorer som aldri går i svart" }, d: { en: "Phones keep the last known setlist, cue triggers and tabs if the Wi-Fi drops, show a clear 'waiting for signal' dot, and reconnect by themselves.", da: "Telefonerne beholder den sidst kendte setliste, stikord og tabs, hvis Wi-Fi falder ud, viser tydeligt 'venter på signal' og forbinder selv igen.", de: "Handys behalten Setliste, Stichworte und Tabs bei WLAN-Ausfall, zeigen klar 'warte auf Signal' und verbinden sich selbst neu.", fr: "Les téléphones conservent la dernière setlist connue, les déclencheurs de cues et les onglets si le Wi-Fi tombe, affichent un point clair « en attente de signal » et se reconnectent automatiquement.", es: "Los teléfonos mantienen la última setlist conocida, los disparadores de cues y las pestañas si se cae la red Wi-Fi, muestran un punto claro de «esperando señal» y se reconectan automáticamente.", sv: "Telefoner behåller den senast kända låtlistan, cue-triggers och flikar om Wi-Fi-anslutningen bryts, visar en tydlig prick för 'väntar på signal' och återansluter automatiskt.", no: "Telefoner beholder den sist kjente spillelisten, cue-triggere og faner hvis Wi-Fi faller ut, viser en tydelig prikk for «venter på signal», og kobler til igjen automatisk." } },
  { k: "04", pro: true, t: { en: "Hot-standby with two PCs (A/B)", da: "Hot-standby med to pc'er (A/B)", de: "Hot-Standby mit zwei PCs (A/B)", fr: "Redondance active avec deux PC (A/B)", es: "Hot-standby con dos PC (A/B)", sv: "Hot-standby med två datorer (A/B)", no: "Hot-standby med to PC-er (A/B)" }, d: { en: "A backup PC follows the main console cue by cue. If the main PC dies, the backup takes over — and the band's stage monitors follow automatically.", da: "En backup-pc følger hovedpulten cue for cue. Dør hoved-pc'en, overtager backuppen – og bandets scenemonitorer følger automatisk med.", de: "Ein Backup-PC folgt der Hauptkonsole Cue für Cue. Fällt der Haupt-PC aus, übernimmt das Backup – die Bühnenmonitore folgen automatisch.", fr: "Un PC de secours suit la console principale cue par cue. Si le PC principal tombe en panne, le secours prend le relais — et les moniteurs de scène du groupe suivent automatiquement.", es: "Un PC de respaldo sigue a la consola principal cue por cue. Si el PC principal falla, el de respaldo toma el control, y los monitores de escenario de la banda lo siguen automáticamente.", sv: "En backup-dator följer huvudkonsolen cue för cue. Om huvuddatorn kraschar tar backupen över — och bandets scenmonitorer följer med automatiskt.", no: "En reserve-PC følger hovedkonsollen cue for cue. Hvis hoved-PC-en svikter, tar reservemaskinen over — og bandets scenemonitorer følger automatisk med." } },
];

function Redundancy() {
  const t = useT();
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.3em] text-go">{t({ en: "Redundancy", da: "Redundans", de: "Redundanz", fr: "Redondance", es: "Redundancia", sv: "Redundans", no: "Redundans" })}</p>
      <h2 className="max-w-3xl text-3xl font-black sm:text-4xl">{t({ en: "Built so the show goes on. Whatever happens.", da: "Bygget så showet fortsætter. Uanset hvad.", de: "Gebaut, damit die Show weitergeht. Egal was passiert.", fr: "Conçu pour que le spectacle continue. Quoi qu'il arrive.", es: "Diseñado para que el espectáculo continúe. Pase lo que pase.", sv: "Byggt så att showen kan fortsätta. Vad som än händer.", no: "Bygget for at showet fortsetter. Uansett hva som skjer." })}</h2>
      <p className="mt-4 max-w-2xl text-muted-foreground">{t({ en: "Misclicks, crashes, Wi-Fi dropouts, a dead laptop — every layer has a backup.", da: "Fejltryk, nedbrud, Wi-Fi-udfald, en død bærbar – hvert lag har en backup.", de: "Fehlklicks, Abstürze, WLAN-Ausfälle, ein toter Laptop – jede Ebene hat ein Backup.", fr: "Erreurs de clic, plantages, coupures Wi-Fi, ordinateur en panne — chaque niveau dispose d'un plan de secours.", es: "Clics accidentales, fallos, caídas de Wi-Fi, un portátil que muere: cada nivel tiene un respaldo.", sv: "Feltryckningar, krascher, Wi-Fi-avbrott, en kraschad laptop — varje lager har en backup.", no: "Feilklikk, krasj, Wi-Fi-brudd, en bærbar PC som dør — hvert ledd har en backup." })}</p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {REDUNDANCY.map((r) => (
          <div key={r.k} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 font-mono text-sm font-black text-go">{r.k}{r.pro && <span className="rounded bg-go/15 px-2 py-0.5 text-xs">PRO</span>}</div>
            <h3 className="mt-3 text-xl font-black">{t(r.t)}</h3>
            <p className="mt-2 text-muted-foreground">{t(r.d)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Landing() {
  return <SiteShell><LandingBody /></SiteShell>;
}

function LandingBody() {
  const t = useT();
  const { lang } = useLang();
  const rows: [L, string, string, string][] = [
    [{ en: 'Runs on Windows', da: 'Kører på Windows', de: 'Läuft unter Windows', fr: 'Fonctionne sous Windows', es: 'Funciona en Windows', sv: 'Körs på Windows', no: 'Kjører på Windows' }, '✅', '❌ Mac only', '✅'],
    [{ en: 'Modern & actively developed', da: 'Moderne og aktivt udviklet', de: 'Modern & aktiv entwickelt', fr: 'Moderne & activement développé', es: 'Moderno y en desarrollo activo', sv: 'Modern & aktivt utvecklad', no: 'Moderne og aktivt utviklet' }, '✅', '✅', '❌'],
    [{ en: 'Free stage monitors per band member', da: 'Gratis scenemonitorer til hvert bandmedlem', de: 'Kostenlose Monitore für jedes Bandmitglied', fr: 'Retours gratuits pour chaque musicien', es: 'Monitores gratis para cada músico', sv: 'Gratis scenmonitorer för varje bandmedlem', no: 'Gratis scenemonitorer til hvert bandmedlem' }, '✅', '❌', '❌'],
    [{ en: 'Lyrics, chords & 4–8 string tabs with transpose', da: 'Tekst, akkorder og 4–8 strengs tabs med transponering', de: 'Texte, Akkorde & 4–8-saitige Tabs mit Transponierung', fr: 'Paroles, accords & tabs 4–8 cordes transposables', es: 'Letras, acordes y tabs de 4–8 cuerdas con transposición', sv: 'Text, ackord & 4–8-strängade tabs med transponering', no: 'Tekst, akkorder og 4–8-strengs tabs med transponering' }, '✅', '❌', '❌'],
    [{ en: 'Phone remote', da: 'Telefon-fjernbetjening', de: 'Handy-Fernbedienung', fr: 'Télécommande mobile', es: 'Control remoto móvil', sv: 'Mobilfjärrkontroll', no: 'Mobilfjernkontroll' }, '✅', '➖ iOS app', '❌'],
    [{ en: 'MIDI controller learn', da: 'MIDI-controller indlæring', de: 'MIDI-Controller lernen', fr: 'Apprentissage contrôleur MIDI', es: 'Aprendizaje de controlador MIDI', sv: 'MIDI-kontroller inlärning', no: 'MIDI-kontroller innlæring' }, '✅', '✅', '➖'],
    [{ en: 'Group cues with delay per cue', da: 'Gruppecues med forsinkelse pr. cue', de: 'Gruppen-Cues mit Verzögerung pro Cue', fr: 'Groupes avec délai par cue', es: 'Grupos con retardo por cue', sv: 'Gruppcues med fördröjning per cue', no: 'Gruppecues med forsinkelse per cue' }, '✅', '✅', '➖'],
    [{ en: 'Built-in click track generator', da: 'Indbygget clicktrack-generator', de: 'Integrierter Click-Generator', fr: 'Générateur de clic intégré', es: 'Generador de claqueta integrado', sv: 'Inbyggd klickgenerator', no: 'Innebygd klikkgenerator' }, '✅', '❌', '❌'],
    [{ en: 'Search songs, cues & triggers', da: 'Søg i sange, cues og stikord', de: 'Songs, Cues & Stichworte suchen', fr: 'Recherche chansons, cues & repères', es: 'Buscar canciones, cues y pies', sv: 'Sök låtar, cues & stickord', no: 'Søk i sanger, cues og stikkord' }, '✅', '✅', '➖'],
    [{ en: 'Grid & magnetic window snapping', da: 'Gitter- og magnetisk vinduessnap', de: 'Raster- & magnetisches Fenster-Snapping', fr: 'Fenêtres en grille & aimantées', es: 'Ventanas con cuadrícula y magnéticas', sv: 'Rutnät- & magnetisk fönstersnap', no: 'Rutenett- og magnetisk vindussnap' }, '✅', '❌', '❌'],
    [{ en: 'Up to 32 audio outputs', da: 'Op til 32 lydudgange', de: 'Bis zu 32 Audioausgänge', fr: "Jusqu'à 32 sorties audio", es: 'Hasta 32 salidas de audio', sv: 'Upp till 32 ljudutgångar', no: 'Opptil 32 lydutganger' }, '✅', '✅', '✅'],
    [{ en: 'Autosave to file & crash recovery', da: 'Autogem til fil og genstart efter nedbrud', de: 'Autospeichern & Absturz-Wiederherstellung', fr: 'Sauvegarde auto & reprise après crash', es: 'Autoguardado y recuperación tras fallo', sv: 'Autospara & återställning efter krasch', no: 'Autolagring og gjenoppretting etter krasj' }, '✅', '➖', '➖'],
    [{ en: 'Two-PC hot-standby', da: "Hot-standby med to pc'er", de: 'Hot-Standby mit zwei PCs', fr: 'Secours à chaud sur deux PC', es: 'Respaldo en caliente con dos PC', sv: 'Hot-standby med två datorer', no: 'Hot-standby med to PC-er' }, '✅ Pro', '➖ 2 licenses', '❌'],
    [{ en: '7 languages', da: '7 sprog', de: '7 Sprachen', fr: '7 langues', es: '7 idiomas', sv: '7 språk', no: '7 språk' }, '✅', '❌', '❌'],
    [{ en: 'Price', da: 'Pris', de: 'Preis', fr: 'Prix', es: 'Precio', sv: 'Pris', no: 'Pris' }, `Free / ${PRICES[lang].monthly}`, 'From $399 / licence · bundle $999 · Mac required', 'Free (donationware)'],
  ];
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.3em] text-go">Show control · Windows 10/11</p>
        <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-6xl">{t({ en: "Professional show control for Windows. Built for the stage.", da: "Professionel show control til Windows. Bygget til scenen.", de: "Professionelle Show-Control für Windows. Gebaut für die Bühne.", fr: "Show control professionnel pour Windows. Conçu pour la scène.", es: "Control de espectáculos profesional para Windows. Diseñado para el escenario.", sv: "Professionell show control för Windows. Byggt för scenen.", no: "Profesjonell show control for Windows. Bygget for scenen." })}</h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{t({ en: "Easy to learn, powerful when it matters. Audio, MIDI, setlists and stage monitors in one clear workspace — for theatre, touring bands, churches, events and schools.", da: "Nem at lære, stærk når det gælder. Lyd, MIDI, setlister og scenemonitorer samlet i ét overskueligt program – til teater, turnerende bands, kirker, events og skoler.", de: "Leicht zu lernen, stark, wenn es darauf ankommt. Audio, MIDI, Setlisten und Bühnenmonitore in einer klaren Oberfläche – für Theater, Bands auf Tour, Kirchen, Events und Schulen.", fr: "Facile à prendre en main, puissant quand il le faut. Audio, MIDI, setlists et moniteurs de scène réunis dans un espace de travail clair — pour le théâtre, les tournées, les églises, l'événementiel et les écoles.", es: "Fácil de aprender, potente cuando importa. Audio, MIDI, setlists y monitores de escenario en un espacio de trabajo claro: para teatro, grupos de gira, iglesias, eventos y escuelas.", sv: "Enkelt att lära sig, kraftfullt när det gäller. Ljud, MIDI, låtlistor och scenmonitorer i en tydlig arbetsyta — för teater, turnerande band, kyrkor, evenemang och skolor.", no: "Enkelt å lære, kraftfullt når det gjelder. Lyd, MIDI, spillelister og scenemonitorer i et ryddig arbeidsområde — for teater, turnéband, kirker, arrangementer og skoler." })}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/download" className="hidden rounded-lg bg-go px-6 py-3 text-lg font-black text-go-foreground md:inline-block">⬇ {t({ en: "Download for Windows", da: "Download til Windows", de: "Für Windows laden", fr: "Télécharger pour Windows", es: "Descargar para Windows", sv: "Ladda ner för Windows", no: "Last ned for Windows" })}</Link>
        </div>
      </section>

      <Benefits />
      <Tour />
      <Redundancy />

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-black">{t({ en: "Why StageCue?", da: "Hvorfor StageCue?", de: "Warum StageCue?", fr: "Pourquoi StageCue ?", es: "¿Por qué StageCue?", sv: "Varför StageCue?", no: "Hvorfor StageCue?" })}</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead className="text-sm uppercase tracking-wider text-muted-foreground"><tr><th className="py-2"></th><th>StageCue</th><th>QLab</th><th>Multiplay</th></tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r[0].en}><td className="py-3 font-semibold">{t(r[0])}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AllFeatures />

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="rounded-2xl border-2 border-go p-10 text-center">
          <h2 className="text-3xl font-black">{t({ en: "Ready for your next show?", da: "Klar til næste show?", de: "Bereit für die nächste Show?", fr: "Prêt pour votre prochain spectacle ?", es: "¿Listo para tu próximo show?", sv: "Redo för din nästa show?", no: "Klar for ditt neste show?" })}</h2>
          <p className="mt-3 text-muted-foreground">{t({ en: "Start free. Try every Pro feature for 7 days. Stage monitors are always free.", da: "Start gratis. Prøv alle Pro-funktioner i 7 dage. Scenemonitorer er altid gratis.", de: "Kostenlos starten. Alle Pro-Funktionen 7 Tage testen. Bühnenmonitore sind immer kostenlos.", fr: "Commencez gratuitement. Essayez toutes les fonctionnalités Pro pendant 7 jours. Les moniteurs de scène sont toujours gratuits.", es: "Empieza gratis. Prueba todas las funciones Pro durante 7 días. Los monitores de escenario siempre son gratis.", sv: "Börja gratis. Prova alla Pro-funktioner i 7 dagar. Scenmonitorer är alltid kostnadsfria.", no: "Start gratis. Prøv alle Pro-funksjoner i 7 dager. Scenemonitorer er alltid gratis." })}</p>
          <Link to="/priser" className="mt-6 inline-block rounded-lg bg-go px-6 py-3 font-black text-go-foreground">{t({ en: "See pricing", da: "Se priser", de: "Preise ansehen", fr: "Voir les tarifs", es: "Ver precios", sv: "Se priser", no: "Se priser" })}</Link>
        </div>
      </section>
    </>
  );
}
