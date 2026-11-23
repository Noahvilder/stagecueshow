import { useEffect, useRef, useState } from "react";
import type { Engine } from "@/lib/show/engine";
import { FPS_LIST, LtcReader, LtcWriter, MtcReader, formatTc, framesToTc, mtcFull, mtcQuarter, parseTc, realFps, tcToFrames, type Fps } from "@/lib/show/timecode";

type Out = { deviceId: string; label: string };
type Cfg = { fps: Fps; start: string; mtcOn: boolean; mtcPort: string; ltcOn: boolean; ltcOut: string; ltcCh: number; ltcLevel: number; followGo: boolean; src: "off" | "mtc" | "ltc"; mtcIn: string; ltcIn: string; trig: boolean };
const DEF: Cfg = { fps: 25, start: "00:00:00:00", mtcOn: true, mtcPort: "", ltcOn: false, ltcOut: "", ltcCh: 1, ltcLevel: 0.5, followGo: false, src: "off", mtcIn: "", ltcIn: "", trig: true };
const KEY = "stagecue.timecode";

export interface TcTarget { id: string; name: string; tc: string }

/** Timecode generator (MTC + LTC) and reader (MTC/LTC chase) with cue triggers. */
export function TimecodePanel({ engine, outputs, goId, targets, onTrigger, onClose }: { engine: () => Engine; outputs: Out[]; goId: number | null; targets: TcTarget[]; onTrigger: (id: string) => void; onClose: () => void }) {
  const [c, setC] = useState<Cfg>(DEF);
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (v) setC({ ...DEF, ...v }); } catch { /* ignore */ } }, []);
  const set = (p: Partial<Cfg>) => setC((x) => { const n = { ...x, ...p }; localStorage.setItem(KEY, JSON.stringify(n)); return n; });
  const [ports, setPorts] = useState<{ outs: string[]; ins: string[] }>({ outs: [], ins: [] });
  const [inputs, setInputs] = useState<Out[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [frame, setFrame] = useState(0);
  const [inTc, setInTc] = useState<{ n: number; fps: Fps; at: number } | null>(null);
  const gen = useRef<{ t0: number; f0: number; q: number; timer: number; ctx?: AudioContext; next?: number; chunk?: number; w?: LtcWriter } | null>(null);

  useEffect(() => {
    const e = engine();
    (e.midi ? Promise.resolve() : e.initMidi().then(() => undefined)).then(() => setPorts({ outs: e.midiOutputs(), ins: Array.from(e.midi?.inputs.values() ?? []).map((i) => i.name ?? i.id) })).catch((x) => setErr((x as Error).message));
    navigator.mediaDevices?.enumerateDevices().then((d) => setInputs(d.filter((x) => x.kind === "audioinput").map((x) => ({ deviceId: x.deviceId, label: x.label || "Indgang" })))).catch(() => {});
  }, [engine]);

  const stop = () => {
    const g = gen.current; gen.current = null;
    if (g) { clearInterval(g.timer); g.ctx?.close().catch(() => {}); }
    setRunning(false);
  };
  const start = async () => {
    stop(); setErr(null);
    const fps = c.fps;
    const st = parseTc(c.start);
    const f0 = st ? tcToFrames(st, fps) : 0;
    const e = engine();
    const out = c.mtcOn ? Array.from(e.midi?.outputs.values() ?? []).find((o) => (o.name ?? o.id) === c.mtcPort) : undefined;
    if (c.mtcOn && !out) setErr("Vælg en MIDI-udgang til MTC");
    const g: NonNullable<typeof gen.current> = { t0: performance.now(), f0, q: 0, timer: 0 };
    if (out) { try { out.send(mtcFull(framesToTc(f0, fps), fps)); } catch { /* sysex not allowed */ } }
    if (c.ltcOn) {
      try {
        let ctx: AudioContext;
        try { ctx = new AudioContext(c.ltcOut ? ({ sinkId: c.ltcOut } as AudioContextOptions) : undefined); } catch { ctx = new AudioContext(); }
        const max = ctx.destination.maxChannelCount;
        if (max > 2) { ctx.destination.channelCount = max; ctx.destination.channelInterpretation = "discrete"; }
        g.ctx = ctx; g.w = new LtcWriter(fps, ctx.sampleRate, c.ltcLevel); g.chunk = 0;
        g.next = ctx.currentTime + 0.1;
        g.t0 = performance.now() + 100;
      } catch (x) { setErr("LTC: " + (x as Error).message); }
    }
    const rf = realFps(fps);
    g.timer = window.setInterval(() => {
      const el = (performance.now() - g.t0) / 1000;
      if (el < 0) return;
      if (out) {
        const target = Math.floor(el * rf * 4);
        if (target - g.q > 16) g.q = target - 8; // resync after stall
        while (g.q <= target) {
          const block = Math.floor(g.q / 8), piece = g.q % 8;
          out.send(mtcQuarter(framesToTc(g.f0 + block * 2, fps), piece, fps));
          g.q++;
        }
      }
      if (g.ctx && g.w && g.next !== undefined) {
        const K = 5;
        while (g.next < g.ctx.currentTime + 0.4) {
          const data = g.w.render(g.f0 + g.chunk! * K, K);
          const ch = g.ctx.destination.channelCount;
          const buf = g.ctx.createBuffer(ch, data.length, g.ctx.sampleRate);
          buf.copyToChannel(data, Math.min(ch, Math.max(1, c.ltcCh)) - 1);
          const src = g.ctx.createBufferSource(); src.buffer = buf; src.connect(g.ctx.destination); src.start(g.next);
          g.chunk!++; g.next += K / rf;
        }
      }
      setFrame(g.f0 + Math.floor(el * rf));
    }, 5);
    gen.current = g;
    setRunning(true);
  };
  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start with the first GO when "follow GO" is on.
  const lastGo = useRef(goId);
  useEffect(() => { if (goId && goId !== lastGo.current && c.followGo && !gen.current) void start(); lastGo.current = goId; }, [goId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reader: MTC
  useEffect(() => {
    if (c.src !== "mtc") return;
    const e = engine();
    const r = new MtcReader();
    const ins = Array.from(e.midi?.inputs.values() ?? []).filter((i) => !c.mtcIn || (i.name ?? i.id) === c.mtcIn);
    const h = (ev: Event) => { const d = (ev as MIDIMessageEvent).data; if (!d) return; const n = r.push(d); if (n !== null) setInTc({ n, fps: r.fps, at: performance.now() }); };
    ins.forEach((i) => i.addEventListener("midimessage", h));
    return () => ins.forEach((i) => i.removeEventListener("midimessage", h));
  }, [c.src, c.mtcIn, ports, engine]);

  // Reader: LTC from an audio input
  useEffect(() => {
    if (c.src !== "ltc") return;
    let stream: MediaStream | null = null, ctx: AudioContext | null = null, dead = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { ...(c.ltcIn ? { deviceId: { exact: c.ltcIn } } : {}), echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        if (dead) return;
        ctx = new AudioContext();
        const r = new LtcReader(ctx.sampleRate);
        const node = ctx.createScriptProcessor(2048, 1, 1);
        node.onaudioprocess = (ev) => r.push(ev.inputBuffer.getChannelData(0), (tc, df) => { const fps: Fps = df ? 29.97 : c.fps === 29.97 ? 30 : c.fps; setInTc({ n: tcToFrames(tc, fps), fps, at: performance.now() }); });
        ctx.createMediaStreamSource(stream).connect(node); node.connect(ctx.destination);
      } catch (x) { setErr("LTC-indgang: " + (x as Error).message); }
    })();
    return () => { dead = true; stream?.getTracks().forEach((t) => t.stop()); ctx?.close().catch(() => {}); };
  }, [c.src, c.ltcIn, c.fps]);

  // Cue triggers: fire each cue once when incoming time passes its timecode.
  const fired = useRef(new Set<string>());
  const prevN = useRef<number | null>(null);
  useEffect(() => {
    if (!inTc || !c.trig) return;
    const p = prevN.current; prevN.current = inTc.n;
    if (p === null || inTc.n < p || inTc.n - p > inTc.fps * 2) { fired.current.clear(); return; } // jump = relocate
    for (const t of targets) {
      const tt = parseTc(t.tc); if (!tt) continue;
      const n = tcToFrames(tt, inTc.fps);
      if (n > p && n <= inTc.n && !fired.current.has(t.id)) { fired.current.add(t.id); onTrigger(t.id); }
    }
  }, [inTc]); // eslint-disable-line react-hooks/exhaustive-deps

  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 250); return () => clearInterval(t); }, []);
  const inLive = inTc && performance.now() - inTc.at < 500;
  const sel = "w-full rounded border border-input bg-input px-2 py-1 text-sm";

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[26rem] max-w-[95vw] rounded-lg border border-border bg-card p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-widest text-standby">⏱ Timecode</h2><button onClick={() => { stop(); onClose(); }} className="rounded bg-secondary px-2 py-0.5 text-sm" title="Luk (stopper generatoren)">✕</button></div>
      {err && <div className="mb-2 rounded bg-destructive/20 px-2 py-1 text-xs text-destructive">{err}</div>}

      <div className="rounded border border-border p-2">
        <div className="mb-1 text-xs font-bold uppercase text-muted-foreground">Generator (master)</div>
        <div className={`text-center font-mono text-4xl font-black tabular-nums ${running ? "text-go" : ""}`}>{formatTc(framesToTc(running ? frame : tcToFrames(parseTc(c.start) ?? { h: 0, m: 0, s: 0, f: 0 }, c.fps), c.fps), c.fps)}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <label>Framerate<select className={sel} value={c.fps} onChange={(e) => set({ fps: Number(e.target.value) as Fps })} disabled={running}>{FPS_LIST.map((f) => <option key={f} value={f}>{f === 29.97 ? "29.97 DF" : f} fps</option>)}</select></label>
          <label>Start-tid<input className={sel + " font-mono"} value={c.start} onChange={(e) => set({ start: e.target.value })} disabled={running} placeholder="01:00:00:00" /></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={c.mtcOn} onChange={(e) => set({ mtcOn: e.target.checked })} disabled={running} /> Send MTC</label>
          <select className={sel} value={c.mtcPort} onChange={(e) => set({ mtcPort: e.target.value })} disabled={running || !c.mtcOn}><option value="">– MIDI-udgang –</option>{ports.outs.map((p) => <option key={p}>{p}</option>)}</select>
          <label className="flex items-center gap-1"><input type="checkbox" checked={c.ltcOn} onChange={(e) => set({ ltcOn: e.target.checked })} disabled={running} /> Send LTC (lyd)</label>
          <select className={sel} value={c.ltcOut} onChange={(e) => set({ ltcOut: e.target.value })} disabled={running || !c.ltcOn}><option value="">Standard lydudgang</option>{outputs.map((o) => <option key={o.deviceId} value={o.deviceId}>{o.label}</option>)}</select>
          <label>LTC-kanal<input type="number" min={1} max={64} className={sel} value={c.ltcCh} onChange={(e) => set({ ltcCh: Math.max(1, Number(e.target.value) || 1) })} disabled={running || !c.ltcOn} /></label>
          <label>LTC-niveau<input type="range" min={0.05} max={1} step={0.05} className="w-full" value={c.ltcLevel} onChange={(e) => set({ ltcLevel: Number(e.target.value) })} disabled={running || !c.ltcOn} /></label>
          <label className="col-span-2 flex items-center gap-1"><input type="checkbox" checked={c.followGo} onChange={(e) => set({ followGo: e.target.checked })} /> Start automatisk ved næste GO</label>
        </div>
        <div className="mt-2 flex gap-2">
          {!running ? <button onClick={() => void start()} className="flex-1 rounded bg-go px-3 py-1.5 font-black text-background">▶ Start</button> : <button onClick={stop} className="flex-1 rounded bg-destructive px-3 py-1.5 font-black text-destructive-foreground">■ Stop</button>}
        </div>
      </div>

      <div className="mt-2 rounded border border-border p-2">
        <div className="mb-1 text-xs font-bold uppercase text-muted-foreground">Modtag (chase)</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label>Kilde<select className={sel} value={c.src} onChange={(e) => { prevN.current = null; set({ src: e.target.value as Cfg["src"] }); }}><option value="off">Fra</option><option value="mtc">MTC (MIDI ind)</option><option value="ltc">LTC (lyd ind)</option></select></label>
          {c.src === "mtc" && <label>MIDI-indgang<select className={sel} value={c.mtcIn} onChange={(e) => set({ mtcIn: e.target.value })}><option value="">Alle</option>{ports.ins.map((p) => <option key={p}>{p}</option>)}</select></label>}
          {c.src === "ltc" && <label>Lydindgang<select className={sel} value={c.ltcIn} onChange={(e) => set({ ltcIn: e.target.value })}><option value="">Standard</option>{inputs.map((o) => <option key={o.deviceId} value={o.deviceId}>{o.label}</option>)}</select></label>}
        </div>
        {c.src !== "off" && <div className={`mt-2 text-center font-mono text-3xl font-black tabular-nums ${inLive ? "text-standby" : "text-muted-foreground"}`}>{inTc ? formatTc(framesToTc(inTc.n, inTc.fps), inTc.fps) : "--:--:--:--"}<div className="text-xs font-normal">{inLive ? `${inTc!.fps === 29.97 ? "29.97 DF" : inTc!.fps} fps · låst` : "intet signal"}</div></div>}
        <label className="mt-2 flex items-center gap-1 text-xs"><input type="checkbox" checked={c.trig} onChange={(e) => set({ trig: e.target.checked })} /> Affyr cues med timecode-trigger ({targets.length})</label>
      </div>
    </div>
  );
}
