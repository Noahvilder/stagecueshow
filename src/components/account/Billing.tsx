import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tryStripeEnvironment } from "@/lib/stripe";
import { createPortalSession } from "@/utils/payments.functions";

type Lic = { plan: string; status: string; current_period_end: string | null };
type Pay = { id: string; description: string; amount_cents: number; currency: string; status: string; receipt_url: string | null; created_at: string };

const PLAN_NAME: Record<string, string> = { monthly: "Månedlig", yearly: "Årlig", lifetime: "Lifetime", none: "Gratis" };
const STATUS: Record<string, string> = { paid: "Betalt", refunded: "Refunderet", failed: "Mislykket", pending: "Afventer" };
const fmtDate = (s: string) => new Date(s).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
const fmtMoney = (c: number, cur: string) => new Intl.NumberFormat("da-DK", { style: "currency", currency: cur }).format(c / 100);

export function Billing() {
  const [lic, setLic] = useState<Lic | null>(null);
  const [pays, setPays] = useState<Pay[] | null>(null);
  const env = tryStripeEnvironment() ?? "live";
  const load = () => {
    supabase.from("licenses").select("plan,status,current_period_end").eq("environment", env).maybeSingle()
      .then(({ data }) => setLic(data ?? { plan: "none", status: "inactive", current_period_end: null }));
    supabase.from("payments").select("id,description,amount_cents,currency,status,receipt_url,created_at").eq("environment", env)
      .order("created_at", { ascending: false }).then(({ data }) => setPays(data ?? []));
  };
  useEffect(() => {
    load();
    // Payment confirmation arrives a few seconds after checkout; poll briefly.
    if (window.location.search.includes("checkout=done")) {
      const t = setInterval(load, 3000); setTimeout(() => clearInterval(t), 30000);
      return () => clearInterval(t);
    }
    return undefined;
  }, []);
  const portal = async () => {
    const r = await createPortalSession({ data: { environment: env, returnUrl: window.location.href } });
    if ("error" in r) return alert(r.error);
    window.open(r.url, "_blank");
  };
  const active = lic?.status === "active";
  return (
    <>
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Abonnement</h2>
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
          <div><div className="text-xs text-muted-foreground">Plan</div><div className="font-bold">{lic ? PLAN_NAME[lic.plan] ?? lic.plan : "…"}</div></div>
          <div><div className="text-xs text-muted-foreground">Status</div><div className={active ? "font-bold text-go" : "font-bold"}>{lic ? (active ? "Aktiv" : "Ikke aktiv") : "…"}</div></div>
          <div><div className="text-xs text-muted-foreground">{lic?.plan === "lifetime" ? "Gyldig" : "Fornyes / udløber"}</div>
            <div className="font-bold">{lic?.plan === "lifetime" && active ? "Altid" : lic?.current_period_end ? fmtDate(lic.current_period_end) : "—"}</div></div>
        </div>
        {active && lic?.plan !== "lifetime" && (
          <button onClick={portal} className="mt-2 text-xs underline">Administrér abonnement (betalingskort, opsigelse)</button>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Tidligere betalinger</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card text-sm">
          {pays === null ? <p className="p-4">…</p> : pays.length === 0 ? (
            <p className="p-4 text-muted-foreground">Ingen betalinger endnu.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pays.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div><div className="font-semibold">{p.description || "StageCue Pro"}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(p.created_at)} · {STATUS[p.status] ?? p.status}</div></div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold">{fmtMoney(p.amount_cents, p.currency)}</span>
                    {p.receipt_url && <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-xs underline">Kvittering</a>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
