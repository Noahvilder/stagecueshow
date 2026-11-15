import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DeviceList } from "@/components/account/DeviceList";
import { MAX_PULT_DEVICES } from "@/lib/show/device";

export const Route = createFileRoute("/_authenticated/konto")({
  head: () => ({
    meta: [
      { title: "Min konto og licens – StageCue" },
      { name: "description", content: "Se din StageCue pult-licens og administrér dine pult-enheder." },
      { property: "og:title", content: "Min konto og licens – StageCue" },
      { property: "og:description", content: "Pult-licens og enheder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Konto,
});

const PLANS = [
  { id: "monthly", name: "Månedlig", price: "79 kr.", per: "/ md.", note: "Fleksibelt – stop når som helst" },
  { id: "yearly", name: "Årlig", price: "699 kr.", per: "/ år", note: "Spar ca. 25%" },
  { id: "lifetime", name: "Lifetime", price: "1.499 kr.", per: "engangsbeløb", note: "Ej den for altid" },
] as const;

function Konto() {
  const [lic, setLic] = useState<{ plan: string; status: string } | null>(null);
  useEffect(() => {
    supabase.from("licenses").select("plan,status").maybeSingle().then(({ data }) => setLic(data ?? { plan: "none", status: "inactive" }));
  }, []);
  const active = lic?.status === "active";
  return (
    <div className="min-h-screen bg-background p-4 text-foreground sm:p-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <span className="font-mono text-lg font-black tracking-widest text-go">STAGECUE</span>
          <Link to="/hub" className="rounded bg-secondary px-3 py-1.5 text-sm font-semibold">← Shows</Link>
        </header>
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Pult-licens</h2>
          <div className="rounded-xl border border-border bg-card p-4">
            {lic ? (active ? <p className="font-bold text-go">Aktiv · {lic.plan}</p> : <p>Ingen aktiv licens endnu. Scenemonitors er altid gratis.</p>) : "…"}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className="flex flex-col rounded-xl border-2 border-border bg-card p-4">
                <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{p.name}</div>
                <div className="mt-1 text-2xl font-black">{p.price}</div>
                <div className="text-xs text-muted-foreground">{p.per}</div>
                <div className="mt-2 flex-1 text-xs">{p.note}</div>
                <button disabled className="mt-3 rounded bg-go px-3 py-2 font-bold text-go-foreground opacity-50">Betaling kommer snart</button>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Pult-enheder (maks {MAX_PULT_DEVICES})</h2>
          <DeviceList />
        </section>
      </div>
    </div>
  );
}
