import { useRef, useState } from "react";
import { CLICK_SOUNDS, METERS, clickLength, renderClickWav, scheduleAll, type ClickSettings } from "@/lib/show/clicktrack";

export function ClickGenerator({ onClose, onCreate }: { onClose: () => void; onCreate: (blob: Blob, name: string) => Promise<void> }) {
  const [s, setS] = useState<ClickSettings>({ meter: "4/4", bars: 2, startBpm: 120, endBpm: 120, sound: "wood", accent: true, accentGain: 0.5, volume: 0.9 });
  const [ramp, setRamp] = useState(false);
  const [busy, setBusy] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const eff: ClickSettings = { ...s, endBpm: ramp ? s.endBpm : s.startBpm };
  const set = (p: Partial<ClickSettings>) => setS((x) => ({ ...x, ...p }));
  const stop = () => { ctxRef.current?.close(); ctxRef.current = null; };
  const preview = () => {
    stop();
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    scheduleAll(ctx, eff, ctx.currentTime + 0.05);
  };
  const name = `Click ${eff.meter} ${eff.startBpm}${ramp ? `→${eff.endBpm}` : ""} BPM`;
  const num = "w-full rounded border border-border bg-background px-2 py-1 font-mono";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4" onClick={() => { stop(); onClose(); }}>
      <div className="w-full max-w-lg space-y-4 rounded-lg border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">⏱️ Click / Optælling</h2><button onClick={() => { stop(); onClose(); }} className="text-muted-foreground">✕</button></div>
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
          <button onClick={preview} className="rounded bg-secondary px-3 py-2 text-sm font-semibold">▶ Prøvelyt</button>
          <button onClick={stop} className="rounded bg-secondary px-3 py-2 text-sm font-semibold">■ Stop</button>
          <button disabled={busy} onClick={async () => { setBusy(true); stop(); try { await onCreate(await renderClickWav(eff), name); onClose(); } finally { setBusy(false); } }} className="ml-auto rounded bg-standby px-4 py-2 text-sm font-bold text-background disabled:opacity-50">{busy ? "Laver…" : "Opret som cue"}</button>
        </div>
      </div>
    </div>
  );
}
