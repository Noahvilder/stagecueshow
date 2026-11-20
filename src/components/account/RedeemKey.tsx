import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function RedeemKey({ onDone }: { onDone?: () => void }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc("redeem_license_key", { _code: code });
    setBusy(false);
    const r = data as { ok: boolean; error?: string } | null;
    if (error || !r?.ok) return setMsg({ ok: false, text: r?.error ?? "Noget gik galt. Prøv igen." });
    setMsg({ ok: true, text: "Koden er indløst – du har nu Pro! Genstart pulten for at låse alt op." });
    setCode(""); onDone?.();
  };
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Har du en licenskode?</h2>
      <form onSubmit={submit} className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-4">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SC-XXXX-XXXX-XXXX"
          aria-label="Licenskode" className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm" />
        <button disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {busy ? "Indløser…" : "Indløs kode"}
        </button>
        {msg && <p className={`w-full text-sm ${msg.ok ? "text-go" : "text-destructive"}`}>{msg.text}</p>}
      </form>
    </section>
  );
}
