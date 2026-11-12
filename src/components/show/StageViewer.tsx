import { useEffect, useMemo, useState } from "react";
import type { Peer as PeerT } from "peerjs";
import { PEER_PREFIX, isValidCode, type HostMsg, type RemoteState } from "@/lib/show/remote";
import { parseChordPro } from "@/lib/show/chordpro";

type Mode = "lyrics" | "hud";
const SIZES = ["text-2xl", "text-4xl", "text-6xl", "text-8xl"];

export function ChordText({ src, size }: { src: string; size: string }) {
  const lines = useMemo(() => parseChordPro(src), [src]);
  return (
    <div className={`${size} font-semibold leading-tight`}>
      {lines.map((l, i) => !l.segs.length || (l.segs.length === 1 && !l.segs[0]!.text && !l.segs[0]!.chord) ? <div key={i} className="h-[1em]" /> : (
        <div key={i} className="flex flex-wrap items-end">
          {l.segs.map((s, j) => (
            <span key={j} className={`inline-flex flex-col ${l.chordsOnly ? "mr-[1em]" : ""}`}>
              {l.hasChords && <span className="min-h-[1em] whitespace-pre pr-[0.3em] text-[0.75em] font-black text-standby">{s.chord || "\u00a0"}</span>}
              {!l.chordsOnly && <span className="whitespace-pre text-foreground">{s.text || "\u00a0"}</span>}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function StageViewer({ initialCode }: { initialCode?: string | undefined }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [target, setTarget] = useState(initialCode && isValidCode(initialCode) ? initialCode : "");
  const [mode, setMode] = useState<Mode | null>(null);
  const [size, setSize] = useState(1);
  const [state, setState] = useState<RemoteState | null>(null);
  const [online, setOnline] = useState(false);
  const [ui, setUi] = useState(true);

  useEffect(() => {
    if (!target) return;
    let peer: PeerT | null = null; let dead = false; let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      if (dead || !peer) return;
      const c = peer.connect(PEER_PREFIX + target, { reliable: true });
      c.on("open", () => setOnline(true));
      c.on("data", (d) => { const m = d as HostMsg; if (m.t === "state") setState(m.s); });
      c.on("close", () => { setOnline(false); retry = setTimeout(connect, 2000); });
    };
    (async () => {
      const { Peer } = await import("peerjs");
      if (dead) return;
      peer = new Peer();
      peer.on("open", connect);
      peer.on("error", (e) => { setOnline(false); if (e.type === "peer-unavailable") retry = setTimeout(connect, 2500); });
      peer.on("disconnected", () => peer?.reconnect());
    })();
    return () => { dead = true; clearTimeout(retry); peer?.destroy(); };
  }, [target]);

  useEffect(() => {
    if (!mode) return;
    let t: ReturnType<typeof setTimeout>;
    const show = () => { setUi(true); clearTimeout(t); t = setTimeout(() => setUi(false), 3000); };
    show();
    window.addEventListener("pointermove", show); window.addEventListener("pointerdown", show);
    return () => { clearTimeout(t); window.removeEventListener("pointermove", show); window.removeEventListener("pointerdown", show); };
  }, [mode]);

  const flat = useMemo(() => (state?.songs ?? []).flatMap((s) => s.cues.map((c) => ({ ...c, song: s.name }))), [state]);
  const idx = flat.findIndex((c) => c.id === state?.standbyId);
  const cur = idx >= 0 ? flat[idx] : undefined;
  const next = idx >= 0 ? flat[idx + 1] : undefined;
  const body = (c?: typeof cur) => [c?.text, c?.notes].filter(Boolean).join("\n\n");

  if (!target) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
      <h1 className="text-3xl font-black">Scenemonitor</h1>
      <p className="text-muted-foreground">Skriv pultens 6-cifrede kode</p>
      <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="w-48 rounded border border-border bg-input p-3 text-center font-mono text-3xl tracking-widest" />
      <button disabled={!isValidCode(code)} onClick={() => setTarget(code)} className="rounded bg-go px-6 py-3 text-lg font-bold text-go-foreground disabled:opacity-40">Forbind</button>
    </div>
  );

  if (!mode) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
      <div className={`text-sm font-bold ${online ? "text-go" : "text-destructive"}`}>{online ? `● Forbundet · ${state?.showName ?? ""}` : "○ Forbinder…"}</div>
      <h1 className="text-3xl font-black">Hvad vil du se?</h1>
      <button onClick={() => setMode("lyrics")} className="w-72 rounded-lg bg-standby p-5 text-xl font-black text-standby-foreground">🎤 Lyrics & akkorder</button>
      <button onClick={() => setMode("hud")} className="w-72 rounded-lg bg-secondary p-5 text-xl font-black">⏱ Nu & Næste</button>
    </div>
  );

  const full = () => document.documentElement.requestFullscreen?.().catch(() => {});

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-baseline justify-between gap-4 border-b border-border px-6 py-3">
        <div className="truncate text-3xl font-black text-standby">{cur?.song ?? "—"}</div>
        <div className="truncate text-2xl font-bold" style={{ color: cur?.color }}>{cur?.name ?? ""}</div>
      </header>
      <main className="min-h-0 flex-1 overflow-auto px-6 py-4">
        {!online && <div className="mb-2 text-destructive">○ Forbindelse tabt – prøver igen…</div>}
        {mode === "lyrics"
          ? (body(cur) ? <ChordText src={body(cur)} size={SIZES[size]!} /> : <div className="text-3xl text-muted-foreground">Ingen tekst på dette cue</div>)
          : <div className="flex h-full flex-col justify-center gap-4"><div className="text-[12vw] font-black leading-none" style={{ color: cur?.color }}>{cur?.name ?? "—"}</div><div className="text-4xl text-muted-foreground">{cur?.song}</div></div>}
      </main>
      {next && <footer className="border-t border-border bg-card px-6 py-3 text-2xl"><span className="text-muted-foreground">Næste: </span><b>{next.song !== cur?.song ? `${next.song} · ` : ""}{next.name}</b></footer>}
      <div className={`absolute right-3 top-16 flex gap-2 transition-opacity duration-500 ${ui ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        {mode === "lyrics" && SIZES.map((_, i) => <button key={i} onClick={() => setSize(i)} className={`rounded px-3 py-2 font-bold ${size === i ? "bg-standby text-standby-foreground" : "bg-secondary"}`}>{"A" + "+".repeat(i)}</button>)}
        <button onClick={full} className="rounded bg-secondary px-3 py-2 font-bold">⛶</button>
        <button onClick={() => setMode(null)} className="rounded bg-secondary px-3 py-2 font-bold">Skift</button>
      </div>
    </div>
  );
}
