import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emptyShow, parseShow } from "@/lib/show/logic";
import { isValidCode, normCode } from "@/lib/show/remote";

export const Route = createFileRoute("/_authenticated/hub")({
  head: () => ({
    meta: [
      { title: "Vælg mode og show – StageCue" },
      { name: "description", content: "Vælg PC- eller mobil-mode og åbn et af dine shows." },
      { property: "og:title", content: "Vælg mode og show – StageCue" },
      { property: "og:description", content: "Dine StageCue shows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Hub,
});

type Row = { id: string; name: string; updated_at: string };
const MODE_KEY = "stagecue.mode";

function Hub() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"pc" | "mobile" | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [email, setEmail] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [join, setJoin] = useState("");
  const joinCode = normCode(join);
  const joinOk = isValidCode(joinCode);

  const [shared, setShared] = useState<{ id: string; name: string; remote_code: string | null }[]>([]);
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const load = async () => {
    const { data } = await supabase.from("shows").select("id,name,updated_at").order("updated_at", { ascending: false });
    setRows(data ?? []);
    const sh = await supabase.rpc("shared_shows");
    setShared(sh.data ?? []);
  };
  useEffect(() => {
    const m = localStorage.getItem(MODE_KEY);
    if (m === "pc" || m === "mobile") setMode(m);
    else setMode(window.matchMedia("(max-width: 700px)").matches ? "mobile" : "pc");
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    load();
  }, []);

  const pick = (m: "pc" | "mobile") => { setMode(m); localStorage.setItem(MODE_KEY, m); };
  const open = (id: string) => nav({ to: mode === "mobile" ? "/mobile/$showId" : "/pc/$showId", params: { showId: id } });

  const create = async (show = emptyShow()) => {
    const { data, error } = await supabase.from("shows").insert({ name: show.name, data: show as never }).select("id").single();
    if (error) return alert(error.message);
    open(data.id);
  };
  const del = async (r: Row) => {
    if (!confirm(`Slet "${r.name}"?`)) return;
    await supabase.from("shows").delete().eq("id", r.id);
    load();
  };
  const signOut = async () => { await supabase.auth.signOut(); nav({ to: "/auth", replace: true }); };

  return (
    <div className="min-h-screen bg-background p-4 text-foreground sm:p-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3"><button onClick={() => nav({ to: "/show" })} className="rounded bg-secondary px-3 py-1.5 text-sm font-semibold">← Tilbage</button><span className="font-mono text-lg font-black tracking-widest text-go">STAGECUE</span></div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden truncate sm:inline">{email}</span>
            <button onClick={() => nav({ to: "/konto" })} className="rounded bg-secondary px-3 py-1.5 font-semibold text-foreground">Konto</button>
            <button onClick={signOut} className="rounded bg-secondary px-3 py-1.5 font-semibold text-foreground">Log ud</button>
          </div>
        </header>

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">1 · Vælg mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {([["pc", "🖥️", "PC / Pult", "Fuldt system: lyd, MIDI, pedal, vinduer"], ["mobile", "📱", "Mobil", "Hurtig fjernbetjening og test fra salen"]] as const).map(([k, ic, t, d]) => (
              <button key={k} onClick={() => pick(k)} className={`rounded-xl border-2 p-4 text-left transition ${mode === k ? "border-go bg-card" : "border-border bg-card/50 opacity-70"}`}>
                <div className="text-3xl">{ic}</div>
                <div className="mt-1 text-lg font-black">{t}</div>
                <div className="text-xs text-muted-foreground">{d}</div>
              </button>
            ))}
          </div>
        </section>

        {shared.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Shows du er inviteret til</h2>
            <div className="flex flex-col gap-2">
              {shared.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg bg-card p-3">
                  <div className="min-w-0 flex-1 truncate text-lg font-bold">{s.name}</div>
                  {s.remote_code && isValidCode(s.remote_code)
                    ? <button onClick={() => nav({ to: "/view", search: { code: s.remote_code! } })} className="rounded-lg bg-go px-4 py-2 font-bold text-go-foreground">🎤 Åbn monitor</button>
                    : <span className="text-xs text-muted-foreground">Pulten er ikke tændt endnu</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Forbind til et andet show</h2>
          <input value={join} onChange={(e) => setJoin(e.target.value)} placeholder="Pultens kode" autoCapitalize="characters" className="w-full rounded-lg border border-border bg-background px-3 py-3 font-mono text-lg tracking-widest" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button disabled={!joinOk} onClick={() => nav({ to: "/view", search: { code: joinCode } })} className="rounded-lg bg-go px-3 py-3 font-bold text-go-foreground disabled:opacity-40">🎤 Som musiker</button>
            <button disabled={!joinOk} onClick={() => nav({ to: "/remote", search: { code: joinCode } })} className="rounded-lg bg-secondary px-3 py-3 font-bold disabled:opacity-40">📱 Fjernbetjening</button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Fjernbetjening virker kun hvis du er logget ind som showets ejer.</p>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">2 · Vælg show</h2>
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="rounded bg-secondary px-3 py-1.5 text-sm font-semibold">Importér JSON</button>
              <button onClick={() => create()} className="rounded bg-go px-3 py-1.5 text-sm font-bold text-go-foreground">+ Nyt show</button>
            </div>
            <input ref={fileRef} type="file" accept=".json" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try { await create(parseShow(await f.text())); } catch (err) { alert("Ugyldig fil: " + (err as Error).message); }
            }} />
          </div>
          <div className="flex flex-col gap-2">
            {rows === null && <div className="text-muted-foreground">Henter…</div>}
            {rows?.length === 0 && <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">Ingen shows endnu – opret dit første.</div>}
            {rows?.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 rounded-lg bg-card p-2">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => open(r.id)} className="min-w-0 flex-1 p-2 text-left">
                  <div className="truncate text-lg font-bold">{r.name}</div>
                  <div className="text-xs text-muted-foreground">Ændret {new Date(r.updated_at).toLocaleString("da-DK")}</div>
                </button>
                <button onClick={() => setInviteFor(inviteFor === r.id ? null : r.id)} className="rounded px-3 py-2 text-sm font-semibold">👥 Invitér</button>
                <button onClick={() => del(r)} className="rounded px-3 py-2 text-sm text-destructive">Slet</button>
                <button onClick={() => open(r.id)} className="rounded-lg bg-go px-4 py-2 font-bold text-go-foreground">Åbn</button>
              </div>
              {inviteFor === r.id && <Invites showId={r.id} />}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Invites({ showId }: { showId: string }) {
  const [list, setList] = useState<{ id: string; email: string }[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const load = async () => {
    const { data } = await supabase.from("show_invites").select("id,email").eq("show_id", showId).order("created_at");
    setList(data ?? []);
  };
  useEffect(() => { load(); }, [showId]);
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    const v = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return setMsg("Skriv en gyldig email.");
    const { error } = await supabase.from("show_invites").insert({ show_id: showId, email: v });
    if (error) return setMsg(error.code === "23505" ? "Den email er allerede inviteret." : error.message);
    setEmail(""); load();
  };
  const remove = async (id: string) => { await supabase.from("show_invites").delete().eq("id", id); load(); };
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="mb-2 text-xs text-muted-foreground">Musikere logger ind med deres egen gratis konto og ser så showet under "Shows du er inviteret til". De kan kun se scenemonitoren – ikke ændre showet.</p>
      <form onSubmit={add} className="flex gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="musiker@email.dk" className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2" />
        <button className="rounded-lg bg-go px-3 py-2 font-bold text-go-foreground">Invitér</button>
      </form>
      {msg && <p className="mt-2 text-sm text-destructive">{msg}</p>}
      <ul className="mt-2 flex flex-col gap-1">
        {list.map((i) => <li key={i.id} className="flex items-center justify-between text-sm"><span className="truncate">{i.email}</span><button onClick={() => remove(i.id)} className="text-destructive">Fjern</button></li>)}
        {list.length === 0 && <li className="text-sm text-muted-foreground">Ingen inviteret endnu.</li>}
      </ul>
    </div>
  );
}
