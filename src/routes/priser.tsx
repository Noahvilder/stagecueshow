import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, meta, PLANS } from "@/components/site/SiteShell";

export const Route = createFileRoute("/priser")({
  head: () => meta("Priser – StageCue pult-licens", "Månedlig 79 kr., årlig 699 kr. eller lifetime 1.499 kr. Op til 3 pult-computere. Scenemonitors er altid gratis."),
  component: Priser,
});

function Priser() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-20">
        <h1 className="text-4xl font-black sm:text-5xl">Én licens. Hele bandet med.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Licensen gælder pulten på op til 3 computere. Musikere og teknikere bruger scenemonitorer gratis – uden login.</p>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.id} className={`flex flex-col rounded-2xl border-2 bg-card p-6 ${"featured" in p ? "border-go" : "border-border"}`}>
              {"featured" in p && <span className="mb-2 self-start rounded bg-go px-2 py-0.5 text-xs font-bold text-go-foreground">Mest populær</span>}
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{p.name}</div>
              <div className="mt-2 text-4xl font-black">{p.price}</div>
              <div className="text-sm text-muted-foreground">{p.per}</div>
              <p className="mt-4 flex-1 text-sm">{p.note}</p>
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                <li>✓ Alle funktioner</li><li>✓ Op til 3 pult-computere</li><li>✓ Gratis opdateringer</li>
              </ul>
              <button disabled className="mt-6 rounded-lg bg-go px-4 py-3 font-bold text-go-foreground opacity-50">Betaling åbner snart</button>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">Priser inkl. moms. Har du spørgsmål? <Link to="/support" className="underline">Kontakt os</Link>.</p>
      </section>
    </SiteShell>
  );
}
