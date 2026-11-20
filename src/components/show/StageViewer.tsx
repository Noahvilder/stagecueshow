import { useEffect, useMemo, useRef, useState } from "react";
import type { Peer as PeerT } from "peerjs";
import { PEER_PREFIX, isValidCode, normCode, type HostMsg, type RemoteCmd, type RemoteState } from "@/lib/show/remote";
import { parseChordPro } from "@/lib/show/chordpro";
import { monitorBody, stickyIndex } from "@/lib/show/monitors";
import { isTabLine, transposeSource } from "@/lib/show/tabs";

const HIST_KEY = "stagecue.viewer.history";
type Hist = { code: string; name: string; monitor: string; at: number };
const readHist = (): Hist[] => { try { return JSON.parse(localStorage.getItem(HIST_KEY) ?? "[]") as Hist[]; } catch { return []; } };
import { Button } from "@/components/ui/button";
import { trackFeature } from "@/lib/track";

type Mode = "lyrics" | "hud";
const VIEW_KEY = "stagecue.viewer";
const SIZES = ["text-2xl", "text-4xl", "text-6xl", "text-8xl"];

export function ChordText({ src, size, transpose = 0 }: { src: string; size: string; transpose?: number }) {
  const blocks = useMemo(() => {
    const out: { tab: boolean; text: string }[] = [];
    for (const l of transposeSource(src, transpose).split("\n")) {
      const tab = isTabLine(l); const last = out[out.length - 1];
      if (last && last.tab === tab) last.text += "\n" + l; else out.push({ tab, text: l });
    }
    return out;
  }, [src, transpose]);
  return <div className={size}>{blocks.map((b, i) => b.tab
    ? <pre key={i} className="my-[0.4em] overflow-x-auto rounded bg-card p-[0.3em] font-mono text-[0.6em] font-bold leading-snug text-foreground">{b.text}</pre>
    : <ChordLines key={i} src={b.text} />)}</div>;
}

function ChordLines({ src }: { src: string }) {
  const lines = useMemo(() => parseChordPro(src), [src]);
  return (
    <div className="font-semibold leading-tight">
      {lines.map((l, i) => !l.segs.length || (l.segs.length === 1 && !l.segs[0]?.text && !l.segs[0]?.chord) ? <div key={i} className="h-[1em]" /> : (
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

export function StageViewer({ initialCode, initialMonitor }: { initialCode?: string | undefined; initialMonitor?: string }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [target, setTarget] = useState(initialCode && isValidCode(initialCode) ? initialCode : "");
  const [mode, setMode] = useState<Mode | null>(null);
  const [size, setSize] = useState(1);
  const [state, setState] = useState<RemoteState | null>(null);
  const [online, setOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(t); }, []);
  const stale = online && lastSeen > 0 && tick - lastSeen > 3000;
  const [ui, setUi] = useState(true);
  const [monitorId, setMonitorId] = useState(initialMonitor ?? "");
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [scroll, setScroll] = useState(0);
  const [transpose, setTranspose] = useState(0);
  const [hist, setHist] = useState<Hist[]>([]);
  useEffect(() => setHist(readHist()), []);
  const mainRef = useRef<HTMLElement | null>(null);
  const monitorRef = useRef(monitorId);
  monitorRef.current = monitorId;
  const connRef = useRef<{ open: boolean; send: (d: RemoteCmd) => void } | null>(null);
  useEffect(() => { if (connRef.current?.open) connRef.current.send({ t: "viewerRole", monitor: monitorId }); }, [monitorId]);
  useEffect(() => {
    const raw = localStorage.getItem(VIEW_KEY);
    const saved = raw ? JSON.parse(raw) as { code?: string; monitor?: string } : {};
    if (!initialCode && saved.code && isValidCode(saved.code)) { setCode(saved.code); setTarget(saved.code); }
    if (!initialMonitor && !initialCode && saved.monitor) setMonitorId(saved.monitor);
  }, [initialCode, initialMonitor]);
  useEffect(() => { if (target) localStorage.setItem(VIEW_KEY, JSON.stringify({ code: target, monitor: monitorId })); }, [target, monitorId]);
  useEffect(() => {
    if (!target) return;
    if (state?.showName) trackFeature("monitor.connect", true);
    const prev = readHist();
    const name = state?.showName || prev.find((h) => h.code === target)?.name || `Show ${target}`;
    const list = [{ code: target, name, monitor: monitorId, at: Date.now() }, ...prev.filter((h) => h.code !== target)].slice(0, 10);
    localStorage.setItem(HIST_KEY, JSON.stringify(list)); setHist(list);
  }, [target, state?.showName, monitorId]);
  const profile = state?.monitors?.find((m) => m.id === monitorId);
  const viewMode = profile?.mode ?? mode;

  // Offline cache: show the last known setlist instantly, even before / without a connection.
  useEffect(() => {
    if (!target) return;
    try { const c = localStorage.getItem("stagecue.viewer.cache." + target); if (c) setState((s) => s ?? JSON.parse(c)); } catch {}
  }, [target]);
  useEffect(() => {
    if (!target) return;
    let peer: PeerT | null = null; let dead = false; let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      clearTimeout(retry);
      if (dead || !peer) return;
      if (peer.disconnected) { peer.reconnect(); return; }
      const c = peer.connect(PEER_PREFIX + target, { reliable: true, metadata: { role: "viewer" } });
      c.on("open", () => { setOnline(true); c.send({ t: "viewerRole", monitor: monitorRef.current }); });
      c.on("data", (d) => { const m = d as HostMsg; if (m.t === "state") { setState(m.s); setLastSeen(Date.now()); try { localStorage.setItem("stagecue.viewer.cache." + target, JSON.stringify(m.s)); } catch {} } });
      c.on("close", () => { setOnline(false); clearTimeout(retry); retry = setTimeout(connect, 1500); });
      cur = c; connRef.current = c as unknown as { open: boolean; send: (d: RemoteCmd) => void };
    };
    let cur: { open: boolean } | null = null;
    (async () => {
      const { Peer } = await import("peerjs");
      if (dead) return;
      peer = new Peer();
      peer.on("open", connect);
      peer.on("error", () => { setOnline(false); clearTimeout(retry); retry = setTimeout(connect, 2000); });
      peer.on("disconnected", () => { if (!dead) setTimeout(() => { if (!dead && peer && !peer.destroyed && peer.disconnected) peer.reconnect(); }, 1000); });
    })();
    const wake = () => { if (!document.hidden && !cur?.open) connect(); };
    document.addEventListener("visibilitychange", wake); window.addEventListener("online", wake);
    const hb = setInterval(wake, 5000);
    return () => { dead = true; clearTimeout(retry); clearInterval(hb); document.removeEventListener("visibilitychange", wake); window.removeEventListener("online", wake); peer?.destroy(); };
  }, [target]);

  useEffect(() => {
    if (!viewMode) return;
    let t: ReturnType<typeof setTimeout>;
    const show = () => { setUi(true); clearTimeout(t); t = setTimeout(() => setUi(false), 3000); };
    show();
    window.addEventListener("pointermove", show); window.addEventListener("pointerdown", show);
    return () => { clearTimeout(t); window.removeEventListener("pointermove", show); window.removeEventListener("pointerdown", show); };
  }, [viewMode]);

  const flat = useMemo(() => (state?.songs ?? []).flatMap((s) => s.cues.map((c) => ({ ...c, song: s.name }))), [state]);
  const sIdx = flat.findIndex((c) => c.id === state?.standbyId);
  const liveIdx = state?.currentId ? flat.findIndex((c) => c.id === state.currentId) : -1;
  // Top = what is playing now (last GO); before any GO, the cue before standby (or standby itself at show start).
  const idx = liveIdx >= 0 ? liveIdx : sIdx > 0 ? sIdx - 1 : sIdx;
  const cur = idx >= 0 ? flat[idx] : undefined;
  const next = sIdx >= 0 && sIdx !== idx ? flat[sIdx] : undefined;
  const body = (c?: typeof cur) => monitorBody(c, profile?.id);
  const stickyCue = idx >= 0 ? flat[stickyIndex(flat, idx, profile?.id)] : undefined;
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [cur?.id]);
  useEffect(() => {
    if (!scroll) return;
    let raf = 0; let last = performance.now(); let acc = 0;
    const tick = (t: number) => {
      acc += ((t - last) / 1000) * scroll * 12; last = t;
      if (acc >= 1 && mainRef.current) { mainRef.current.scrollTop += Math.floor(acc); acc -= Math.floor(acc); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scroll]);

  if (!target) return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
      <a href="/show" className="web-only absolute left-4 top-4 rounded bg-secondary px-3 py-1.5 text-sm font-semibold">← Tilbage</a>
      <div className="font-mono text-xs font-bold uppercase tracking-[0.4em] text-go">StageCue Monitor</div>
      <h1 className="text-3xl font-black">Scenemonitor</h1>
      <p className="text-muted-foreground">Skriv showets kode (12 tegn) eller scan QR-koden fra pulten</p>
      <input autoCapitalize="characters" maxLength={12} value={code} onChange={(e) => setCode(normCode(e.target.value))} className="w-72 rounded border border-border bg-input p-3 text-center font-mono text-2xl tracking-widest" />
      <button disabled={!isValidCode(code)} onClick={() => setTarget(code)} className="rounded bg-go px-6 py-3 text-lg font-bold text-go-foreground disabled:opacity-40">Forbind</button>
      {hist.length > 0 && <div className="mt-6 w-full max-w-sm">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Seneste shows</div>
        {hist.map((h) => <div key={h.code} className="mb-2 flex items-stretch gap-1">
          <button onClick={() => { setCode(h.code); setMonitorId(h.monitor); setTarget(h.code); }} className="min-w-0 flex-1 rounded bg-secondary p-3 text-left"><div className="truncate text-lg font-bold">{h.name}</div><div className="font-mono text-xs text-muted-foreground">{h.code} · {new Date(h.at).toLocaleDateString()}</div></button>
          <button aria-label={`Fjern ${h.name}`} onClick={() => { const l = hist.filter((x) => x.code !== h.code); localStorage.setItem(HIST_KEY, JSON.stringify(l)); setHist(l); }} className="rounded bg-secondary px-3 text-muted-foreground hover:text-destructive">✕</button>
        </div>)}
      </div>}
    </div>
  );

  if (!viewMode) return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
      <a href="/show" className="web-only absolute left-4 top-4 rounded bg-secondary px-3 py-1.5 text-sm font-semibold">← Tilbage</a>
      <div className={`text-sm font-bold ${online ? "text-go" : "text-destructive"}`}>{stale ? "◐ Venter på signal…" : online ? `● Forbundet · ${state?.showName ?? ""}` : "○ Forbinder…"}</div>
      <h1 className="text-3xl font-black">Vælg din rolle på scenen</h1>
      <button onClick={() => { localStorage.removeItem(VIEW_KEY); setTarget(""); setState(null); }} className="text-sm text-muted-foreground underline">Skift pult</button>
      {state?.monitors?.map((m) => <Button key={m.id} variant="secondary" className="h-auto min-h-16 w-full max-w-sm whitespace-normal p-4 text-xl font-bold" onClick={() => { setMonitorId(m.id); setMode(null); }}>{m.name}</Button>)}
      {!state?.monitors?.length && <p className="text-muted-foreground">{online ? "Pulten har ingen roller endnu – teknikeren opretter dem under Indstillinger." : "Venter på pulten…"}</p>}
      <button onClick={() => { setMonitorId(""); setMode("lyrics"); }} className="text-sm text-muted-foreground underline">Ingen rolle – vis fælles tekst</button>

      <a href={`/remote?code=${target ?? ""}`} className="mt-8 text-xs text-muted-foreground/60 hover:text-muted-foreground">Afvikler? Styr showet herfra →</a>
    </div>
  );

  const editCue = editId ? flat.find((c) => c.id === editId) : undefined;
  const standard = (c?: typeof cur) => [c?.text, c?.notes].filter(Boolean).join("\n\n");
  const openEdit = (id?: string) => { const c = flat.find((x) => x.id === id); if (!c) return; setEditId(c.id); setDraft(c.monitorNotes?.[monitorId] || standard(c)); };
  const save = () => { if (!editCue || !profile) return; connRef.current?.send({ t: "setMonitorNote", cueId: editCue.id, monitor: profile.id, text: draft }); setEditId(null); };
  if (editCue && profile) return (
    <div className="flex h-screen flex-col gap-2 bg-background p-3 text-foreground">
      <div className="flex items-center gap-2">
        <b className="text-standby">✏️ {profile.name}</b>
        <select aria-label="Vælg cue" value={editCue.id} onChange={(e) => openEdit(e.target.value)} className="min-w-0 flex-1 rounded border border-input bg-input p-2">
          {flat.map((c) => <option key={c.id} value={c.id}>{c.song} · {c.name}{c.monitorNotes?.[monitorId] ? " •" : ""}</option>)}
        </select>
      </div>
      <textarea aria-label="Mine noter" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="[Eb]Lights go out and I [Bbm]can't be saved" className="min-h-40 flex-1 rounded border border-input bg-input p-3 font-mono text-lg" />
      <div className="max-h-[30vh] overflow-auto rounded border border-border p-2"><ChordText src={draft} size="text-xl" /></div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={!online} className="flex-1 bg-go text-go-foreground">Gem mine noter</Button>
        <Button variant="secondary" onClick={() => setDraft(standard(editCue))}>Hent standard</Button>
        <Button variant="secondary" onClick={() => setEditId(null)}>Annullér</Button>
      </div>
      {!online && <div className="text-destructive">Ingen forbindelse til pulten – kan ikke gemme.</div>}
    </div>
  );

  const full = () => document.documentElement.requestFullscreen?.().catch(() => {});

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-baseline justify-between gap-4 border-b border-border px-6 py-3">
        <div className="truncate text-3xl font-black text-standby">{cur?.song ?? "—"}</div>
        <div className="flex min-w-0 items-baseline gap-3"><div className="truncate text-2xl font-bold" style={{ color: cur?.color }}>{cur?.name ?? ""}</div><button onClick={() => { setMonitorId(""); setMode(null); }} className="shrink-0 rounded bg-secondary px-3 py-1 text-sm font-bold">{profile?.name ?? "Fælles"} · Skift rolle</button><button onClick={() => { localStorage.removeItem(VIEW_KEY); setHist(readHist()); setTarget(""); setState(null); }} className="shrink-0 rounded bg-secondary px-3 py-1 text-sm font-bold">⇄ Skift show</button></div>
      </header>
      <main ref={mainRef} className="min-h-0 flex-1 overflow-auto px-6 py-4">
        {!online && <div className="mb-2 text-destructive">○ Forbindelse tabt – viser sidst kendte show, prøver igen…</div>}
        {stale && <div className="mb-2 animate-pulse text-standby">◐ Venter på signal fra pulten…</div>}
        {viewMode === "lyrics"
          ? (body(stickyCue) ? <ChordText src={body(stickyCue)} transpose={transpose} size={SIZES[size] ?? "text-4xl"} /> : <div className="text-3xl text-muted-foreground">Ingen tekst på dette cue</div>)
          : <div className="flex min-h-full flex-col justify-center gap-4"><div className="break-words text-6xl font-black leading-none" style={{ color: cur?.color }}>{cur?.name ?? "—"}</div><div className="text-4xl text-muted-foreground">{cur?.song}</div>{body(stickyCue) && <ChordText src={body(stickyCue)} transpose={transpose} size={SIZES[size] ?? "text-4xl"} />}</div>}
      </main>
      {next?.stikord && <div className="border-t-4 border-standby bg-standby/15 px-6 py-3 text-4xl font-black text-standby">⏱ GO: {next.stikord}</div>}
      {next && <footer className="border-t border-border bg-card px-6 py-3 text-2xl"><span className="text-muted-foreground">Næste: </span><b>{next.song !== cur?.song ? `${next.song} · ` : ""}{next.name}</b></footer>}
      <div className={`absolute bottom-16 right-3 flex max-w-[calc(100%-1.5rem)] flex-wrap justify-end gap-2 rounded bg-background p-2 transition-opacity duration-500 ${ui ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        {SIZES.map((_, i) => <Button variant="secondary" key={i} onClick={() => setSize(i)} className={size === i ? "bg-standby text-standby-foreground" : ""}>{"A" + "+".repeat(i)}</Button>)}
        <Button variant="secondary" title="Transponér ned" onClick={() => setTranspose((t) => t - 1)}>♭</Button>
        <Button variant="secondary" title="Nulstil transponering" onClick={() => setTranspose(0)} className={transpose ? "bg-standby text-standby-foreground" : ""}>{transpose > 0 ? `+${transpose}` : transpose}</Button>
        <Button variant="secondary" title="Transponér op" onClick={() => setTranspose((t) => t + 1)}>♯</Button>
        {profile && cur && <Button variant="secondary" onClick={() => openEdit(cur.id)}>✏️ Redigér mine noter</Button>}
        <Button variant="secondary" title="Rul teksten automatisk – tryk igen for hurtigere" onClick={() => setScroll((v) => (v >= 4 ? 0 : v + 1))} className={scroll ? "bg-standby text-standby-foreground" : ""}>{scroll ? `⇣ Rul ${scroll}x` : "⇣ Auto-rul"}</Button>
        <Button variant="secondary" title="Fuld skærm" onClick={full}>⛶</Button>
        <Button variant="secondary" onClick={() => { setMonitorId(""); setMode(null); }}>Skift</Button>
      </div>
    </div>
  );
}
