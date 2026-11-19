import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Log ind – StageCue Control" },
      { name: "description", content: "Log ind på StageCue for at åbne dine shows på PC eller mobil." },
      { property: "og:title", content: "Log ind – StageCue Control" },
      { property: "og:description", content: "Adgang til dine StageCue shows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav({ to: "/hub", replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) nav({ to: "/hub", replace: true }); });
    return () => data.subscription.unsubscribe();
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg(error.message);
    } else {
      if (!agree) { setMsg("Du skal acceptere vilkår og privatlivspolitik."); setBusy(false); return; }
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin } });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Tjek din email og bekræft kontoen, og log så ind.");
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setMsg(r.error.message);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5 text-foreground">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border bg-card p-6">
        <div className="font-mono text-xl font-black tracking-widest text-go">STAGECUE</div>
        <h1 className="text-2xl font-black">{mode === "in" ? "Log ind" : "Opret konto"}</h1>
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-lg bg-input px-3 text-base outline-none" />
        <input type="password" required minLength={6} placeholder="Adgangskode" value={pw} onChange={(e) => setPw(e.target.value)} className="h-12 rounded-lg bg-input px-3 text-base outline-none" />
        {mode === "up" && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
            <span>Jeg accepterer <a href="/vilkaar" target="_blank" className="underline">vilkårene</a> og <a href="/privatliv" target="_blank" className="underline">privatlivspolitikken</a>.</span>
          </label>
        )}
        <button disabled={busy || (mode === "up" && !agree)} className="h-12 rounded-lg bg-go text-lg font-black text-go-foreground disabled:opacity-40">{mode === "in" ? "Log ind" : "Opret konto"}</button>
        <button type="button" onClick={google} className="flex h-12 items-center justify-center gap-2.5 rounded-lg border border-[#747775] bg-[#FFFFFF] text-sm font-medium text-[#1F1F1F]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continue with Google
        </button>
        {msg && <p className="text-sm text-standby">{msg}</p>}
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="text-sm text-muted-foreground underline">
          {mode === "in" ? "Ingen konto? Opret en" : "Har du en konto? Log ind"}
        </button>
      </form>
      <a href="/view" className="mt-4 block w-full max-w-sm rounded-lg border-2 border-standby p-4 text-center text-lg font-bold text-standby">🎸 Musiker på scenen? Kobl på uden login</a>
    </div>
  );
}
