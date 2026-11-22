import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, meta } from "@/components/site/SiteShell";
import { PRICES, useLang, useT } from "@/lib/site/i18n";

export const Route = createFileRoute("/priser")({
  head: () => meta("Pricing – StageCue Free & Pro", "Start free, try Pro for 7 days. Pro monthly, yearly or lifetime on up to 3 console computers. Band stage monitors are always free."),
  component: () => <SiteShell><Priser /></SiteShell>,
});

function Priser() {
  const t = useT();
  const { lang } = useLang();
  const pr = PRICES[lang];
  const free = [
    { en: "GO button & scene HUD", da: "GO-knap & scene-HUD", de: "GO-Knopf & Szenen-HUD", fr: "Bouton GO & affichage tête haute (HUD) des scènes", es: "Botón GO y visualizador HUD de escenas", sv: "GO-knapp & scen-HUD", no: "GO-knapp og scene-HUD" },
    { en: "Stereo audio, fade, stop & memo cues", da: "Stereo-lyd, fade-, stop- og memo-cues", de: "Stereo-Audio, Fade-, Stop- & Memo-Cues", fr: "Cues audio stéréo, de fondu, d'arrêt et de mémo", es: "Cues de audio estéreo, fade, stop y notas", sv: "Stereoljud-, fade-, stopp- & memo-cues", no: "Stereolyd-, fade-, stopp- og memo-cues" },
    { en: "Up to 2 stage monitors", da: "Op til 2 scenemonitorer", de: "Bis zu 2 Bühnenmonitore", fr: "Jusqu'à 2 moniteurs de scène", es: "Hasta 2 monitores de escenario", sv: "Upp till 2 scenmonitorer", no: "Opptil 2 scenemonitorer" },
    { en: "No time limit", da: "Ingen tidsbegrænsning", de: "Kein Zeitlimit", fr: "Sans limite de temps", es: "Sin límite de tiempo", sv: "Ingen tidsgräns", no: "Ingen tidsbegrensning" },
  ];
  const pro = [
    { en: "Two-PC hot-standby (A/B redundancy)", da: "Hot-standby med to pc'er (A/B-redundans)", de: "Hot-Standby mit zwei PCs (A/B-Redundanz)", fr: "Redondance active sur deux PC (A/B)", es: "Hot-standby en dos PC (redundancia A/B)", sv: "Hot-standby med två datorer (A/B-redundans)", no: "Hot-standby med to PC-er (A/B-redundans)" },
    { en: "Multi-target MIDI out", da: "Multi-MIDI ud til flere enheder", de: "Multi-Target MIDI-Out", fr: "Sortie MIDI multi-cible", es: "Salida MIDI multidestino", sv: "MIDI-utgång med stöd för flera mål", no: "Flermåls MIDI-utgang" },
    { en: "Multi-channel audio routing", da: "Lydrouting til flere udgange", de: "Mehrkanal-Audio-Routing", fr: "Routage audio multicanal", es: "Enrutamiento de audio multicanal", sv: "Flerkanalig ljudrouting", no: "Flerkanals lydruting" },
    { en: "Group cues, waveform & trim", da: "Gruppe-cues, waveform & trim", de: "Gruppen-Cues, Waveform & Trim", fr: "Cues de groupe, forme d'onde et découpe", es: "Cues de grupo, forma de onda y recorte", sv: "Grupp-cues, vågform och trimning", no: "Gruppecues, bølgeform og trimming" },
    { en: "Unlimited monitors & instrument tabs", da: "Ubegrænsede monitorer & instrument-tabs", de: "Unbegrenzte Monitore & Instrument-Tabs", fr: "Moniteurs et onglets d'instruments illimités", es: "Monitores y pestañas de instrumentos ilimitados", sv: "Obegränsat antal monitorer & instrumentflikar", no: "Ubegrenset antall monitorer og instrumentfaner" },
    { en: "Show lock · up to 3 console computers", da: "Show lock · op til 3 pult-computere", de: "Show-Lock · bis zu 3 Pult-Computer", fr: "Verrouillage de spectacle · jusqu'à 3 ordinateurs consoles", es: "Bloqueo de show · hasta 3 ordenadores consola", sv: "Showlås · upp till 3 konsoldatorer", no: "Showlås · opptil 3 konsoll-datamaskiner" },
  ];
  const plans = [
    { id: "monthly", n: { en: "Monthly", da: "Månedlig", de: "Monatlich", fr: "Mensuel", es: "Mensual", sv: "Månadsvis", no: "Månedlig" }, p: pr.monthly, per: { en: "per month", da: "pr. måned", de: "pro Monat", fr: "par mois", es: "al mes", sv: "per månad", no: "per måned" } },
    { id: "yearly", n: { en: "Yearly", da: "Årlig", de: "Jährlich", fr: "Annuel", es: "Anual", sv: "Årsvis", no: "Årlig" }, p: pr.yearly, per: { en: "per year", da: "pr. år", de: "pro Jahr", fr: "par an", es: "al año", sv: "per år", no: "per år" }, featured: true },
    { id: "lifetime", n: { en: "Lifetime", da: "Lifetime", de: "Lifetime", fr: "À vie", es: "De por vida", sv: "Livstid", no: "Livstid" }, p: pr.lifetime, per: { en: "one-time", da: "engangskøb", de: "einmalig", fr: "paiement unique", es: "pago único", sv: "engångskostnad", no: "engangsbeløp" } },
  ];
  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      <h1 className="text-4xl font-black sm:text-5xl">{t({ en: "StageCue pricing: Free and Pro plans", da: "StageCue-priser: Gratis- og Pro-planer", de: "StageCue-Preise: Free- und Pro-Pläne", fr: "Tarifs StageCue : offres Gratuite et Pro", es: "Precios de StageCue: planes Gratis y Pro", sv: "StageCue-priser: Gratis- och Pro-planer", no: "StageCue-priser: Gratis- og Pro-planer" })}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t({ en: "Every Pro feature free for 7 days. Musicians and crew always use stage monitors for free — no login.", da: "Alle Pro-funktioner gratis i 7 dage. Musikere og crew bruger altid scenemonitorer gratis – uden login.", de: "Alle Pro-Funktionen 7 Tage kostenlos. Musiker und Crew nutzen Bühnenmonitore immer kostenlos – ohne Login.", fr: "Toutes les fonctionnalités Pro gratuites pendant 7 jours. Les musiciens et l'équipe technique utilisent toujours les moniteurs de scène gratuitement — sans connexion.", es: "Todas las funciones Pro gratis durante 7 días. Los músicos y el equipo técnico siempre usan los monitores de escenario gratis, sin iniciar sesión.", sv: "Alla Pro-funktioner gratis i 7 dagar. Musiker och crew använder alltid scenmonitorer kostnadsfritt — utan inloggning.", no: "Alle Pro-funksjoner gratis i 7 dager. Musikere og crew bruker alltid scenemonitorer gratis — ingen innlogging." })}</p>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-border bg-card p-6">
          <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Free</div>
          <div className="mt-2 text-4xl font-black">0</div>
          <ul className="mt-4 space-y-1 text-sm">{free.map((f) => <li key={f.en}>✓ {t(f)}</li>)}</ul>
        </div>
        <div className="rounded-2xl border-2 border-go bg-card p-6">
          <div className="text-sm font-bold uppercase tracking-wider text-go">Pro</div>
          <div className="mt-2 text-sm text-muted-foreground">{t({ en: "Everything in Free, plus:", da: "Alt i Gratis, plus:", de: "Alles aus Free, plus:", fr: "Tout ce qui est inclus dans l'offre Gratuite, plus :", es: "Todo lo que incluye la versión Gratis, más:", sv: "Allt i Gratis, plus:", no: "Alt i Gratis, pluss:" })}</div>
          <ul className="mt-4 space-y-1 text-sm">{pro.map((f) => <li key={f.en}>✓ {t(f)}</li>)}</ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className={`flex flex-col rounded-2xl border-2 bg-card p-6 ${p.featured ? "border-go" : "border-border"}`}>
            {p.featured && <span className="mb-2 self-start rounded bg-go px-2 py-0.5 text-xs font-bold text-go-foreground">{t({ en: "Most popular", da: "Mest populær", de: "Beliebt", fr: "Le plus populaire", es: "Más popular", sv: "Mest populär", no: "Mest populær" })}</span>}
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pro · {t(p.n)}</div>
            <div className="mt-2 text-4xl font-black">{p.p}</div>
            <div className="text-sm text-muted-foreground">{t(p.per)}</div>
            <Link to="/konto" className="mt-6 rounded-lg bg-go px-4 py-3 text-center font-bold text-go-foreground">{t({ en: "Buy", da: "Køb", de: "Kaufen", fr: "Acheter", es: "Comprar", sv: "Köp", no: "Kjøp" })}</Link>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">{t({ en: "Have a test or education key? Enter it in the app.", da: "Har du en test- eller skolenøgle? Indtast den i appen.", de: "Test- oder Schulschlüssel? In der App eingeben.", fr: "Vous avez une clé d'essai ou d'éducation ? Saisissez-la dans l'application.", es: "¿Tienes una clave de prueba o para educación? Introdúcela en la aplicación.", sv: "Har du en test- eller utbildningsnyckel? Ange den i appen.", no: "Har du en test- eller utdanningsnøkkel? Skriv den inn i appen." })} <Link to="/support" className="underline">{t({ en: "Questions?", da: "Spørgsmål?", de: "Fragen?", fr: "Des questions ?", es: "¿Preguntas?", sv: "Frågor?", no: "Spørsmål?" })}</Link></p>
    </section>
  );
}
