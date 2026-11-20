import { PRO_LABEL, type ProFeature } from "@/lib/show/plan";

export function ProDialog({ feature, onClose }: { feature: ProFeature; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100000] flex backdrop-blur-sm items-center justify-center bg-background/80 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-standby bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-standby">StageCue Pro</div>
        <h2 className="mb-2 text-xl font-bold">{PRO_LABEL[feature]} er en Pro-funktion</h2>
        <p className="mb-4 text-sm text-muted-foreground">Din prøveperiode er slut. Med Pro får du forlyt, op til 32 individuelle kanaler, gruppe-cues og ubegrænsede scenemonitorer. Scenemonitorer er altid gratis for musikerne.</p>
        <ul className="mb-5 space-y-1 text-sm">
          <li>Månedlig – 79 kr/md</li><li>Årlig – 699 kr/år</li><li>Livstid – 1499 kr én gang</li>
        </ul>
        <div className="flex gap-2">
          <a href="/priser" target="_blank" rel="noreferrer" className="flex-1 rounded bg-standby px-4 py-2 text-center font-bold text-background">Se priser</a>
          <button onClick={onClose} className="rounded bg-secondary px-4 py-2">Ikke nu</button>
        </div>
      </div>
    </div>
  );
}
