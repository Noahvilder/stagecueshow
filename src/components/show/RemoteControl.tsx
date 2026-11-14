import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { DataConnection, Peer as PeerT } from "peerjs";
import { MobileBuilder } from "./MobileBuilder";
import { PEER_PREFIX, isValidCode, type HostMsg, type RemoteCmd, type RemoteState } from "@/lib/show/remote";

const SAVED_KEY = "stagecue.paired";

export function RemoteControl({ initialCode, backToHub, showId }: { initialCode?: string | undefined; backToHub?: boolean; showId?: string }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [target, setTarget] = useState<string | null>(initialCode && isValidCode(initialCode) ? initialCode : null);
  const [status, setStatus] = useState<"idle" | "connecting" | "on" | "lost">("idle");
  const [state, setState] = useState<RemoteState | null>(null);
  const [songId, setSongId] = useState<string | null>(null);
  const [tab, setTab] = useState<"live" | "cues" | "build">("live");
  const [preview, setPreview] = useState<{ id: string; loading: boolean } | null>(null);
  const conn = useRef<DataConnection | null>(null);
  useEffect(() => {
    if (target) { localStorage.setItem(SAVED_KEY, target); return; }
    const saved = localStorage.getItem(SAVED_KEY);
    if (!initialCode && saved && isValidCode(saved)) { setCode(saved); setTarget(saved); }
  }, [target, initialCode]);
  const forget = () => { localStorage.removeItem(SAVED_KEY); setTarget(null); setState(null); setStatus("idle"); };
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const cache = useRef(new Map<string, string>());
  const lastSb = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const id = state?.standbyId;
    if (lastSb.current !== undefined && id !== lastSb.current) navigator.vibrate?.(15);
    lastSb.current = id;
  }, [state?.standbyId]);

  const playLocal = (id: string, url: string) => {
    audioEl.current?.pause();
    const a = new Audio(url);
    audioEl.current = a;
    a.onended = () => setPreview(null);
    a.play().catch(() => setPreview(null));
    setPreview({ id, loading: false });
  };

  useEffect(() => {
    if (!target) return;
    let peer: PeerT | null = null;
    let dead = false;
    let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      clearTimeout(retry);
      if (dead || !peer) return;
      if (peer.disconnected) { peer.reconnect(); return; }
      setStatus((s) => (s === "on" ? "lost" : "connecting"));
      const c = peer.connect(PEER_PREFIX + target, { reliable: true });
      conn.current = c;
      c.on("open", () => setStatus("on"));
      const opened = setTimeout(() => { if (!c.open && !dead) { c.close(); retry = setTimeout(connect, 1500); } }, 8000);
      c.on("open", () => clearTimeout(opened));
      c.on("data", (d) => {
        const m = d as HostMsg;
        if (m.t === "state") setState(m.s);
        else if (m.t === "audio") {
          if (!m.buf) { setPreview(null); alert("Lydfilen findes ikke på pulten."); return; }
          const url = URL.createObjectURL(new Blob([m.buf], { type: m.mime }));
          cache.current.set(m.id, url);
          playLocal(m.id, url);
        }
      });
      c.on("close", () => { if (conn.current !== c) return; setStatus("lost"); clearTimeout(retry); retry = setTimeout(connect, 1500); });
      c.on("error", () => { setStatus("lost"); });
    };
    (async () => {
      const { Peer } = await import("peerjs");
      if (dead) return;
      peer = new Peer();
      peer.on("open", connect);
      peer.on("error", () => {
        setStatus("lost");
        clearTimeout(retry); retry = setTimeout(connect, 2000);
      });
      peer.on("disconnected", () => { if (!dead) setTimeout(() => { if (!dead && peer && !peer.destroyed && peer.disconnected) peer.reconnect(); }, 1000); });
    })();
    // Når telefonen vågner / skifter netværk: forbind straks igen.
    const wake = () => { if (!document.hidden && !conn.current?.open) connect(); };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    const hb = setInterval(() => { if (!document.hidden && !conn.current?.open) connect(); }, 5000);
    return () => { dead = true; clearTimeout(retry); clearInterval(hb); document.removeEventListener("visibilitychange", wake); window.removeEventListener("online", wake); peer?.destroy(); conn.current = null; };
  }, [target]);

  useEffect(() => () => { audioEl.current?.pause(); cache.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  const send = (c: RemoteCmd) => {
    if (!conn.current?.open) { navigator.vibrate?.([300]); return; }
    conn.current.send(c);
    const pattern = c.t === "go" ? [40, 40, 40] : c.t === "panic" || c.t === "stopAll" ? [200, 80, 200, 80, 200] : c.t === "fire" ? [60] : 25;
    navigator.vibrate?.(pattern);
  };
  const listen = (id: string) => {
    if (preview?.id === id) { audioEl.current?.pause(); setPreview(null); return; }
    const u = cache.current.get(id);
    if (u) return playLocal(id, u);
    setPreview({ id, loading: true });
    send({ t: "getAudio", id });
  };

  const back = backToHub ? <Link to="/hub" className="rounded bg-secondary px-3 py-1.5 text-sm font-semibold">← Shows</Link> : null;

  const builder = showId ? <MobileBuilder showId={showId} connected={status === "on"} push={(show) => send({ t: "setShow", show })} ports={state?.midiPorts ?? []} testMidi={(msg) => send({ t: "testMidi", msg })} /> : null;

  if (!target && tab === "build" && builder) {
    return (
      <div className="flex h-[100dvh] flex-col bg-background text-foreground">
        <header className="flex items-center gap-2 border-b border-border px-3 py-2">
          {back}<span className="flex-1 text-sm font-bold">Byg show</span>
          <button onClick={() => setTab("live")} className="rounded bg-secondary px-3 py-1.5 text-sm font-semibold">Forbind</button>
        </header>
        <main className="flex-1 overflow-y-auto p-3">{builder}</main>
      </div>
    );
  }

  if (!target) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
        {back && <div className="absolute left-3 top-3">{back}</div>}
        <div className="font-mono text-lg font-bold tracking-widest text-go">STAGECUE MOBIL</div>
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          {backToHub ? "Åbn showet i PC-mode og slå Telefon-vinduet til – så forbinder mobilen automatisk. Eller skriv koden:" : "Skriv koden fra Telefon-vinduet på hovedcomputeren."}
        </p>
        <input
          inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="w-56 rounded-lg bg-input p-3 text-center font-mono text-4xl tracking-[0.3em] outline-none" aria-label="Kode"
        />
        <button disabled={!isValidCode(code)} onClick={() => setTarget(code)} className="h-14 w-56 rounded-lg bg-go text-xl font-black text-go-foreground disabled:opacity-30">Forbind</button>
        {builder && <button onClick={() => setTab("build")} className="h-12 w-56 rounded-lg bg-secondary font-bold">🛠 Byg show uden pult</button>}
      </div>
    );
  }

  const all = state?.songs.flatMap((s) => s.cues.map((c) => ({ ...c, song: s }))) ?? [];
  const sbIdx = all.findIndex((c) => c.id === state?.standbyId);
  const sb = sbIdx >= 0 ? all[sbIdx] : null;
  const after = sbIdx >= 0 ? all[sbIdx + 1] : null;
  const viewSong = state?.songs.find((s) => s.id === (songId ?? sb?.song.id)) ?? state?.songs[0];
  const on = status === "on";
  const songIdx = state?.songs.findIndex((s) => s.id === viewSong?.id) ?? -1;

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        {back}
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{state?.showName ?? "…"}</span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${on ? "bg-go text-go-foreground" : "bg-destructive text-destructive-foreground"}`}>
          {on ? "● Live" : status === "connecting" ? "Venter på pulten…" : "Genforbinder…"}
        </span>
        {!backToHub && <button onClick={forget} className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">Skift pult</button>}
        {state?.locked && <span className="shrink-0 text-xs font-bold text-standby" title="Pulten er låst til live">🔒</span>}
        <button disabled={!on} onClick={() => send({ t: "mute", on: !state?.muted })} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold disabled:opacity-30 ${state?.muted ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}>{state?.muted ? "🔇 PA muted" : "🔊 PA"}</button>
      </header>

      <main className="flex-1 overflow-y-auto p-3">
        {tab === "build" ? builder : tab === "live" ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border-2 border-standby bg-card p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-standby">Standby · {sb?.song.name ?? "—"}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-8 w-2 shrink-0 rounded" style={{ background: sb?.color }} />
                <span className="text-3xl font-black leading-tight">{sb ? `#${sbIdx + 1} ${sb.name}` : "Slut på show"}</span>
              </div>
              {sb?.notes && <div className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-base text-muted-foreground">{sb.notes}</div>}
              {after && <div className="mt-3 border-t border-border pt-2 text-sm text-muted-foreground">Derefter: <span className="font-semibold text-foreground">{after.name}</span></div>}
            </div>
            <button disabled={!on || !sb} onClick={() => send({ t: "go" })} className="h-36 rounded-2xl bg-go text-7xl font-black tracking-widest text-go-foreground active:scale-[0.98] disabled:opacity-30">GO</button>
            <div className="grid grid-cols-2 gap-2">
              <button disabled={!on} onClick={() => send({ t: "step", d: -1 })} className="h-14 rounded-xl bg-secondary text-lg font-bold disabled:opacity-30">▲ Forrige</button>
              <button disabled={!on} onClick={() => send({ t: "step", d: 1 })} className="h-14 rounded-xl bg-secondary text-lg font-bold disabled:opacity-30">▼ Næste</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="sticky top-0 z-10 flex items-center gap-2 bg-background pb-2">
              <button disabled={songIdx <= 0} onClick={() => setSongId(state!.songs[songIdx - 1]!.id)} className="h-12 w-12 rounded-lg bg-secondary text-xl font-bold disabled:opacity-30">‹</button>
              <select value={viewSong?.id ?? ""} onChange={(e) => setSongId(e.target.value)} className="h-12 min-w-0 flex-1 rounded-lg bg-input px-2 text-base font-bold">
                {state?.songs.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.name}</option>)}
              </select>
              <button disabled={!state || songIdx >= state.songs.length - 1} onClick={() => setSongId(state!.songs[songIdx + 1]!.id)} className="h-12 w-12 rounded-lg bg-secondary text-xl font-bold disabled:opacity-30">›</button>
            </div>
            {viewSong?.cues.length === 0 && <div className="p-6 text-center text-muted-foreground">Ingen cues i denne sang.</div>}
            {viewSong?.cues.map((c) => {
              const running = state!.running.includes(c.id);
              const isSb = c.id === state!.standbyId;
              const pv = preview?.id === c.id;
              return (
                <div key={c.id} className={`rounded-xl bg-card p-3 ${isSb ? "outline outline-2 outline-standby" : ""}`}>
                  <button onClick={() => send({ t: "standby", id: c.id })} className="flex w-full items-center gap-2 text-left">
                    <span className="h-7 w-1.5 shrink-0 rounded" style={{ background: c.color }} />
                    <span className="min-w-0 flex-1 truncate text-lg font-bold">{running && <span className="text-go">● </span>}{c.name}</span>
                    {isSb && <span className="text-xs font-bold text-standby">STANDBY</span>}
                  </button>
                  <div className="mt-2 flex gap-2">
                    {running
                      ? <button disabled={!on} onClick={() => send({ t: "stopCue", id: c.id })} className="h-12 flex-1 rounded-lg bg-destructive font-bold text-destructive-foreground">■ Stop på PA</button>
                      : <button disabled={!on} onClick={() => send({ t: "fire", id: c.id })} className="h-12 flex-1 rounded-lg bg-go font-bold text-go-foreground disabled:opacity-30">📡 Test på PA</button>}
                    {c.hasAudio && (
                      <button disabled={!on && !cache.current.has(c.id)} onClick={() => listen(c.id)} className={`h-12 flex-1 rounded-lg font-bold disabled:opacity-30 ${pv ? "bg-standby text-background" : "bg-secondary"}`}>
                        {pv ? (preview!.loading ? "Henter…" : "■ Stop lyt") : "🎧 Lyt her"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-border p-2">
        <div className="grid grid-cols-2 gap-2">
          <button disabled={!on} onClick={() => send({ t: "panic" })} className="h-12 rounded-lg bg-destructive font-black text-destructive-foreground disabled:opacity-30">PANIC</button>
          <button disabled={!on} onClick={() => send({ t: "stopAll" })} className="h-12 rounded-lg border-2 border-destructive font-black text-destructive disabled:opacity-30">STOP ALT</button>
        </div>
        <div className={`mt-2 grid gap-1 rounded-lg bg-secondary p-1 ${builder ? "grid-cols-3" : "grid-cols-2"}`}>
          {(builder ? (["live", "cues", "build"] as const) : (["live", "cues"] as const)).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`h-10 rounded-md text-sm font-bold ${tab === t ? "bg-background text-foreground" : "text-muted-foreground"}`}>
              {t === "live" ? "Live / GO" : t === "cues" ? "Cues & test" : "🛠 Byg"}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
