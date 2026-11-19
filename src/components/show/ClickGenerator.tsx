import { useEffect, useRef, useState } from "react";
import { CLICK_SOUNDS, METERS, beatTimes, beatsPerBar, clickLength, renderClickWav, scheduleAll, type ClickSettings } from "@/lib/show/clicktrack";

export function ClickGenerator({ onClose, onCreate }: { onClose: () => void; onCreate: (blob: Blob, name: string) => Promise<void> }) {
  const [s, setS] = useState<ClickSettings>({ meter: "4/4", bars: 2, startBpm: 120, endBpm: 120, sound: "wood", accent: true, accentGain: 0.5, volume: 0.9 });
  const [ramp, setRamp] = useState(false);
  const [busy, setBusy] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const eff: ClickSettings = { ...s, endBpm: ramp ? s.endBpm : s.startBpm };
  const set = (p: Partial<ClickSettings>) => setS((x) => ({ ...x, ...p }));
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [angle, setAngle] = useState(0);
  const rafRef = useRef(0);
  const stop = () => { cancelAnimationFrame(rafRef.current); ctxRef.current?.close(); ctxRef.current = null; setPlaying(false); setBeat(-1); setAngle(0); };
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); ctxRef.current?.close(); }, []);
  const preview = async () => {
    stop();
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const t0 = ctx.currentTime + 0.3;
    await scheduleAll(ctx, eff, t0).catch(() => {});
    if (ctxRef.current !== ctx) return;
    const beats = beatTimes(eff);
    const end = clickLength(eff);
    setPlaying(true);
    const tick = () => {
      if (ctxRef.current !== ctx) return;
      const t = ctx.currentTime - t0;
      if (t > end) { stop(); return; }
      let i = 0;
      while (i + 1 < beats.length && beats[i + 1]!.time <= t) i++;
      const cur = beats[i]!, next = beats[i + 1]?.time ?? end;
      const frac = t < 0 ? 0 : Math.min(1, (t - cur.time) / Math.max(0.001, next - cur.time));
      const dir = i % 2 === 0 ? 1 : -1;
      setAngle(dir * 30 * Math.cos(Math.PI * frac));
      setBeat(t < 0 ? -1 : cur.beat - 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  const tempoName = (b: number) => b < 60 ? "Largo" : b < 76 ? "Adagio" : b < 108 ? "Moderato" : b < 120 ? "Allegretto" : b < 168 ? "Allegro" : b < 200 ? "Presto" : "Prestissimo";
  const bump = (d: number) => set({ startBpm: Math.min(400, Math.max(20, s.startBpm + d)) });
  const name = `Click ${eff.meter} ${eff.startBpm}${ramp ? `→${eff.endBpm}` : ""} BPM`;
  const num = "w-full rounded border border-border bg-background px-2 py-1 font-mono";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4" onClick={() => { stop(); onClose(); }}>
      <div className="w-full max-w-lg space-y-4 rounded-lg border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">⏱️ Click / Optælling</h2><button onClick={() => { stop(); onClose(); }} className="text-muted-foreground">✕</button></div>
        <div className="flex flex-col items-center gap-2 rounded-md bg-secondary/40 py-3">
          <svg viewBox="0 0 200 110" className="h-28 w-48" aria-label="Metronom">
            <g transform={`rotate(${angle} 100 105)`}>
              <line x1="100" y1="105" x2="100" y2="8" stroke="var(--standby)" strokeWidth="5" strokeLinecap="round" />
              <circle cx="100" cy={20 + Math.min(60, (s.startBpm - 20) / 4)} r="9" fill="var(--foreground)" />
            </g>
          </svg>
          <div className="text-sm text-muted-foreground">{tempoName(s.startBpm)}</div>
          <div className="flex items-center gap-6">
            <button title="Langsommere" onClick={() => bump(-1)} className="h-10 w-10 rounded-full border border-border text-xl">−</button>
            <div className="w-24 text-center font-mono text-5xl font-light">{s.startBpm}</div>
            <button title="Hurtigere" onClick={() => bump(1)} className="h-10 w-10 rounded-full border border-border text-xl">+</button>
          </div>
          <div className="flex flex-wrap justify-center gap-4 pt-1">
            {Array.from({ length: beatsPerBar(s.meter) }, (_, i) => (
              <span key={i} className={`h-3 w-3 rounded-full border border-foreground ${beat === i ? (i === 0 && s.accent ? "bg-standby border-standby" : "bg-foreground") : ""}`} />
            ))}
          </div>
          <button onClick={playing ? stop : preview} className="mt-1 w-40 rounded border border-foreground py-2 text-sm font-semibold tracking-widest">{playing ? "STOP" : "START"}</button>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-muted-foreground">Taktart</div>
          <div className="grid grid-cols-6 gap-2">
            {METERS.map((m) => (
              <button key={m} onClick={() => set({ meter: m })} className={`rounded-full border px-2 py-2 text-sm font-bold ${s.meter === m ? "border-standby bg-standby text-background" : "border-border hover:bg-secondary"}`}>{m}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <label>Takter<input type="number" min={1} max={500} className={num} value={s.bars} onChange={(e) => set({ bars: Math.max(1, +e.target.value) })} /></label>
          <label>{ramp ? "Start BPM" : "BPM"}<input type="number" min={20} max={400} className={num} value={s.startBpm} onChange={(e) => set({ startBpm: +e.target.value })} /></label>
          {ramp && <label>Slut BPM<input type="number" min={20} max={400} className={num} value={s.endBpm} onChange={(e) => set({ endBpm: +e.target.value })} /></label>}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ramp} onChange={(e) => setRamp(e.target.checked)} /> Tempo stiger/falder jævnt over alle takterne</label>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label>Lyd<select className={num} value={s.sound} onChange={(e) => set({ sound: e.target.value as ClickSettings["sound"] })}>{CLICK_SOUNDS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label>Lydstyrke<input type="range" min={0} max={1} step={0.05} className="w-full" value={s.volume} onChange={(e) => set({ volume: +e.target.value })} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.accent} onChange={(e) => set({ accent: e.target.checked })} /> Accent på 1-slaget</label>
          <label>Accent-styrke<input type="range" min={0} max={1} step={0.05} disabled={!s.accent} className="w-full" value={s.accentGain} onChange={(e) => set({ accentGain: +e.target.value })} /></label>
        </div>
        <div className="text-xs text-muted-foreground">Længde: {clickLength(eff).toFixed(1)} sek.</div>
        <div className="flex gap-2">
          <button disabled={busy} onClick={async () => { setBusy(true); stop(); try { await onCreate(await renderClickWav(eff), name); onClose(); } finally { setBusy(false); } }} className="ml-auto rounded bg-standby px-4 py-2 text-sm font-bold text-background disabled:opacity-50">{busy ? "Laver…" : "Opret som cue"}</button>
        </div>
      </div>
    </div>
  );
}
