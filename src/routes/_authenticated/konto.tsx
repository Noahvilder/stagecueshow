import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PaymentTestModeBanner } from "@/components/payments/PaymentTestModeBanner";
import { CheckoutDialog } from "@/components/payments/CheckoutDialog";
import type { PriceId } from "@/lib/payments/plans";
import { Billing } from "@/components/account/Billing";
import { DeviceList } from "@/components/account/DeviceList";
import { AdminPanel } from "@/components/account/AdminPanel";
import { MAX_PULT_DEVICES } from "@/lib/show/device";
import { isOffline, setForceOffline } from "@/lib/desktop";
import { deleteMyAccount } from "@/lib/account/delete.functions";

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
  { id: "pro_monthly", name: "Månedlig", price: "79 kr.", per: "/ md.", note: "Fleksibelt – stop når som helst" },
  { id: "pro_yearly", name: "Årlig", price: "699 kr.", per: "/ år", note: "Spar ca. 25%" },
  { id: "pro_lifetime", name: "Lifetime", price: "1.499 kr.", per: "engangsbeløb", note: "Ej den for altid" },
] as const;

function Konto() {
  const [buy, setBuy] = useState<PriceId | null>(null);
  return (
    <div className="min-h-screen bg-background p-4 text-foreground sm:p-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <span className="font-mono text-lg font-black tracking-widest text-go">STAGECUE</span>
          <Link to="/hub" className="rounded bg-secondary px-3 py-1.5 text-sm font-semibold">← Shows</Link>
        </header>
        {isOffline() ? <OfflineAccount /> : <>
        <PaymentTestModeBanner />
        <AdminPanel />
        <Billing />
        {buy && <CheckoutDialog priceId={buy} onClose={() => setBuy(null)} />}
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Skift plan</h2>
          <div className=" grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className="flex flex-col rounded-xl border-2 border-border bg-card p-4">
                <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{p.name}</div>
                <div className="mt-1 text-2xl font-black">{p.price}</div>
                <div className="text-xs text-muted-foreground">{p.per}</div>
                <div className="mt-2 flex-1 text-xs">{p.note}</div>
                <button onClick={() => setBuy(p.id)} className="mt-3 rounded bg-go px-3 py-2 font-bold text-go-foreground">Køb</button>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Pult-enheder (maks {MAX_PULT_DEVICES})</h2>
          <DeviceList />
        </section>
        <DeleteAccount />
        </>}
      </div>
    </div>
  );
}

function DeleteAccount() {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!confirm("Slet din konto og alle gemte shows permanent? Dette kan ikke fortrydes.")) return;
    setBusy(true);
    try { await deleteMyAccount(); await supabase.auth.signOut(); window.location.href = "/"; }
    catch (e) { alert("Sletning fejlede: " + (e as Error).message); setBusy(false); }
  };
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Konto og data</h2>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm">
        <span>Læs <a href="/privatliv" className="underline">privatlivspolitikken</a>. Lydfiler ligger kun på din computer.</span>
        <button onClick={run} disabled={busy} className="rounded bg-destructive px-3 py-2 font-bold text-destructive-foreground disabled:opacity-50">Slet min konto</button>
      </div>
    </section>
  );
}

function OfflineAccount() {
  return (
    <section className="flex flex-col gap-3 rounded-xl border-2 border-border bg-card p-5 text-sm">
      <h1 className="text-2xl font-black">Konto og licens</h1>
      <p>Du er offline lige nu. Pulten virker fuldt ud uden internet.</p>
      <p>Licens, betalinger, enheder og admin vises her, så snart computeren er på internettet igen.</p>
      <button onClick={() => { setForceOffline(false); window.location.reload(); }} className="self-start rounded bg-go px-4 py-2 font-bold text-go-foreground">Prøv at gå online</button>
    </section>
  );
}
