import { useEffect, useRef, useState } from "react";
import type { DataConnection, Peer as PeerT } from "peerjs";
import { PEER_PREFIX, isValidCode, type HostMsg, type RemoteCmd, type RemoteState } from "@/lib/show/remote";

export function RemoteControl({ initialCode }: { initialCode?: string | undefined }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [target, setTarget] = useState<string | null>(initialCode && isValidCode(initialCode) ? initialCode : null);
  const [status, setStatus] = useState<"idle" | "connecting" | "on" | "lost">("idle");
  const [state, setState] = useState<RemoteState | null>(null);
  const [songId, setSongId] = useState<string | null>(null);
  const conn = useRef<DataConnection | null>(null);

  useEffect(() => {
    if (!target) return;
    let peer: PeerT | null = null;
    let dead = false;
    let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      if (dead || !peer) return;
      setStatus((s) => (s === "on" ? "lost" : "connecting"));
      const c = peer.connect(PEER_PREFIX + target, { reliable: true });
      conn.current = c;
      c.on("open", () => setStatus("on"));
      c.on("data", (d) => { const m = d as HostMsg; if (m.t === "state") setState(m.s); });
      c.on("close", () => { setStatus("lost"); retry = setTimeout(connect, 2000); });
      c.on("error", () => { setStatus("lost"); });
    };
    (async () => {
      const { Peer } = await import("peerjs");
      if (dead) return;
      peer = new Peer();
      peer.on("open", connect);
      peer.on("error", (e) => {
        setStatus("lost");
        if (e.type === "peer-unavailable") retry = setTimeout(connect, 2500);
      });
      peer.on("disconnected", () => peer?.reconnect());
    })();
    return () => { dead = true; clearTimeout(retry); peer?.destroy(); conn.current = null; };
  }, [target]);

  const send = (c: RemoteCmd) => {
    if (conn.current?.open) { conn.current.send(c); navigator.vibrate?.(30); }
  };

  if (!target) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
        <div className="font-mono text-lg font-bold tracking-widest text-go">STAGECUE REMOTE</div>
        <p className="text-center text-sm text-muted-foreground">Skriv koden fra Fjernbetjening-vinduet på hovedcomputeren.</p>
        <input
          inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="w-56 rounded-lg bg-input p-3 text-center font-mono text-4xl tracking-[0.3em] outline-none" aria-label="Kode"
        />
        <button disabled={!isValidCode(code)} onClick={() => setTarget(code)} className="h-14 w-56 rounded-lg bg-go text-xl font-black text-go-foreground disabled:opacity-30">Forbind</button>
      </div>
    );
  }

  const all = state?.songs.flatMap((s) => s.cues.map((c) => ({ ...c, song: s }))) ?? [];
  const sbIdx = all.findIndex((c) => c.id === state?.standbyId);
  const sb = sbIdx >= 0 ? all[sbIdx] : null;
  const viewSong = state?.songs.find((s) => s.id === (songId ?? sb?.song.id)) ?? state?.songs[0];
  const on = status === "on";

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-background p-3 text-foreground">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-bold tracking-widest text-go">REMOTE</span>
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${on ? "bg-go text-go-foreground" : "bg-destructive text-destructive-foreground"}`}>
          {on ? "● Forbundet til pult" : status === "connecting" ? "Forbinder…" : "Mistet – prøver igen"}
        </span>
      </div>

      <div className="rounded-lg border-2 border-standby bg-card p-3">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{sb ? sb.song.name : state?.showName ?? "—"}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-6 w-2 rounded" style={{ background: sb?.color }} />
          <span className="text-2xl font-black leading-tight">{sb ? `#${sbIdx + 1} ${sb.name}` : "Slut på show"}</span>
        </div>
        {sb?.notes && <div className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">{sb.notes}</div>}
      </div>

      <button disabled={!on || !sb} onClick={() => send({ t: "go" })} className="h-28 rounded-xl bg-go text-6xl font-black tracking-widest text-go-foreground active:scale-[0.98] disabled:opacity-30">GO</button>
      <div className="grid grid-cols-2 gap-2">
        <button disabled={!on} onClick={() => send({ t: "step", d: -1 })} className="h-12 rounded-lg bg-secondary font-bold disabled:opacity-30">▲ Forrige</button>
        <button disabled={!on} onClick={() => send({ t: "step", d: 1 })} className="h-12 rounded-lg bg-secondary font-bold disabled:opacity-30">▼ Næste</button>
        <button disabled={!on} onClick={() => send({ t: "panic" })} className="h-14 rounded-lg bg-destructive text-lg font-black text-destructive-foreground disabled:opacity-30">PANIC</button>
        <button disabled={!on} onClick={() => send({ t: "stopAll" })} className="h-14 rounded-lg border-2 border-destructive text-lg font-black text-destructive disabled:opacity-30">STOP ALT</button>
      </div>

      {state && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-widest text-standby">Test cues</div>
          <select value={viewSong?.id ?? ""} onChange={(e) => setSongId(e.target.value)} className="h-11 rounded-lg bg-input px-2 text-base">
            {state.songs.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.name}</option>)}
          </select>
          {viewSong?.cues.map((c) => {
            const running = state.running.includes(c.id);
            return (
              <div key={c.id} className={`flex items-center gap-2 rounded-lg bg-card p-2 ${c.id === state.standbyId ? "outline outline-2 outline-standby" : ""}`}>
                <span className="h-8 w-1.5 rounded" style={{ background: c.color }} />
                <button onClick={() => send({ t: "standby", id: c.id })} className="min-w-0 flex-1 truncate text-left font-semibold">{running && <span className="text-go">● </span>}{c.name}</button>
                {running
                  ? <button disabled={!on} onClick={() => send({ t: "stopCue", id: c.id })} className="h-10 rounded bg-destructive px-3 text-sm font-bold text-destructive-foreground">Stop</button>
                  : <button disabled={!on} onClick={() => send({ t: "fire", id: c.id })} className="h-10 rounded bg-go px-3 text-sm font-bold text-go-foreground">▶ Test</button>}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">"Test" spiller kun det ene cue. Tryk på navnet for at sætte det som standby.</p>
        </div>
      )}
    </div>
  );
}
