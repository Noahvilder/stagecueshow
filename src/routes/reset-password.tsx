import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ny adgangskode – StageCue" },
      { name: "description", content: "Vælg en ny adgangskode til din StageCue-konto." },
      { property: "og:title", content: "Ny adgangskode – StageCue" },
      { property: "og:description", content: "Nulstil adgangskoden til din StageCue-konto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if ((e === "PASSWORD_RECOVERY" || e === "SIGNED_IN") && s) setReady(true); });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { setMsg("Adgangskoderne er ikke ens."); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg(error.message);
    else { setMsg("Adgangskoden er ændret. Sender dig videre…"); setTimeout(() => nav({ to: "/hub", replace: true }), 1200); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5 text-foreground">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border bg-card p-6">
        <div className="font-mono text-xl font-black tracking-widest text-go">STAGECUE</div>
        <h1 className="text-2xl font-black">Ny adgangskode</h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Åbn linket fra din email for at nulstille. Er linket udløbet, så <a href="/auth" className="underline">bed om et nyt</a>.</p>
        ) : (
          <>
            <input type="password" required minLength={6} placeholder="Ny adgangskode" value={pw} onChange={(e) => setPw(e.target.value)} className="h-12 rounded-lg bg-input px-3 text-base outline-none" />
            <input type="password" required minLength={6} placeholder="Gentag adgangskode" value={pw2} onChange={(e) => setPw2(e.target.value)} className="h-12 rounded-lg bg-input px-3 text-base outline-none" />
            <button disabled={busy} className="h-12 rounded-lg bg-go text-lg font-black text-go-foreground disabled:opacity-40">Gem adgangskode</button>
          </>
        )}
        {msg && <p className="text-sm text-standby">{msg}</p>}
      </form>
    </div>
  );
}
