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
    { en: "GO button & scene HUD", da: "GO-knap & scene-HUD", de: "GO-Knopf & Szenen-HUD" },
    { en: "Stereo audio, fade, stop & memo cues", da: "Stereo-lyd, fade-, stop- og memo-cues", de: "Stereo-Audio, Fade-, Stop- & Memo-Cues" },
    { en: "Up to 2 stage monitors", da: "Op til 2 scenemonitorer", de: "Bis zu 2 Bühnenmonitore" },
    { en: "No time limit", da: "Ingen tidsbegrænsning", de: "Kein Zeitlimit" },
  ];
  const pro = [
    { en: "Multi-target MIDI out", da: "Multi-MIDI ud til flere enheder", de: "Multi-Target MIDI-Out" },
    { en: "Multi-channel audio routing", da: "Lydrouting til flere udgange", de: "Mehrkanal-Audio-Routing" },
    { en: "Group cues, waveform & trim", da: "Gruppe-cues, waveform & trim", de: "Gruppen-Cues, Waveform & Trim" },
    { en: "Unlimited monitors & instrument tabs", da: "Ubegrænsede monitorer & instrument-tabs", de: "Unbegrenzte Monitore & Instrument-Tabs" },
    { en: "Show lock · up to 3 console computers", da: "Show lock · op til 3 pult-computere", de: "Show-Lock · bis zu 3 Pult-Computer" },
  ];
  const plans = [
    { id: "monthly", n: { en: "Monthly", da: "Månedlig", de: "Monatlich" }, p: pr.monthly, per: { en: "per month", da: "pr. måned", de: "pro Monat" } },
    { id: "yearly", n: { en: "Yearly", da: "Årlig", de: "Jährlich" }, p: pr.yearly, per: { en: "per year", da: "pr. år", de: "pro Jahr" }, featured: true },
    { id: "lifetime", n: { en: "Lifetime", da: "Lifetime", de: "Lifetime" }, p: pr.lifetime, per: { en: "one-time", da: "engangskøb", de: "einmalig" } },
  ];
  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      <h1 className="text-4xl font-black sm:text-5xl">{t({ en: "Start free. Go Pro when the show demands it.", da: "Start gratis. Gå Pro, når showet kræver det.", de: "Kostenlos starten. Pro, wenn die Show es verlangt." })}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t({ en: "Every Pro feature free for 7 days. Musicians and crew always use stage monitors for free — no login.", da: "Alle Pro-funktioner gratis i 7 dage. Musikere og crew bruger altid scenemonitorer gratis – uden login.", de: "Alle Pro-Funktionen 7 Tage kostenlos. Musiker und Crew nutzen Bühnenmonitore immer kostenlos – ohne Login." })}</p>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-border bg-card p-6">
          <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Free</div>
          <div className="mt-2 text-4xl font-black">0</div>
          <ul className="mt-4 space-y-1 text-sm">{free.map((f) => <li key={f.en}>✓ {t(f)}</li>)}</ul>
        </div>
        <div className="rounded-2xl border-2 border-go bg-card p-6">
          <div className="text-sm font-bold uppercase tracking-wider text-go">Pro</div>
          <div className="mt-2 text-sm text-muted-foreground">{t({ en: "Everything in Free, plus:", da: "Alt i Gratis, plus:", de: "Alles aus Free, plus:" })}</div>
          <ul className="mt-4 space-y-1 text-sm">{pro.map((f) => <li key={f.en}>✓ {t(f)}</li>)}</ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className={`flex flex-col rounded-2xl border-2 bg-card p-6 ${p.featured ? "border-go" : "border-border"}`}>
            {p.featured && <span className="mb-2 self-start rounded bg-go px-2 py-0.5 text-xs font-bold text-go-foreground">{t({ en: "Most popular", da: "Mest populær", de: "Beliebt" })}</span>}
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pro · {t(p.n)}</div>
            <div className="mt-2 text-4xl font-black">{p.p}</div>
            <div className="text-sm text-muted-foreground">{t(p.per)}</div>
            <button disabled className="mt-6 rounded-lg bg-go px-4 py-3 font-bold text-go-foreground opacity-50">{t({ en: "Checkout opens soon", da: "Betaling åbner snart", de: "Kauf bald verfügbar" })}</button>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">{t({ en: "Have a test or education key? Enter it in the app.", da: "Har du en test- eller skolenøgle? Indtast den i appen.", de: "Test- oder Schulschlüssel? In der App eingeben." })} <Link to="/support" className="underline">{t({ en: "Questions?", da: "Spørgsmål?", de: "Fragen?" })}</Link></p>
    </section>
  );
}
