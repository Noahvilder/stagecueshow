import { useEffect, useState, useSyncExternalStore } from "react";
import type { DmxCue, Show } from "@/lib/show/types";
import { dmx, parseQuick, pct, DMX_DEFAULTS } from "@/lib/show/dmx";

const inp = "w-full rounded border border-input bg-background px-2 py-1 text-sm";
const btn = "rounded bg-secondary px-2.5 py-1 text-xs font-semibold hover:bg-accent";

function useLevels() {
  const [, force] = useState(0);
  useEffect(() => dmx.subscribe(() => force((n) => (n + 1) % 1e6)), []);
  return dmx.levels;
}
const useRaw = () => useSyncExternalStore((f) => { const h = () => f(); window.addEventListener("stagecue.dmxraw", h); return () => window.removeEventListener("stagecue.dmxraw", h); }, () => localStorage.getItem("stagecue.dmxraw") === "1", () => false);
const setRaw = (v: boolean) => { localStorage.setItem("stagecue.dmxraw", v ? "1" : "0"); window.dispatchEvent(new Event("stagecue.dmxraw")); };
const show255 = (v: number, raw: boolean) => (raw ? String(Math.round(v)) : `${pct(v)}%`);

/** 512 cells; click/drag to select. `get` gives the level shown per channel. */
function Grid({ get, sel, onSel, names }: { get: (ch: number) => number | undefined; sel: Set<number>; onSel: (s: Set<number>) => void; names?: Record<number, string> }) {
  const [drag, setDrag] = useState<number | null>(null);
  const range = (a: number, b: number) => { const s = new Set<number>(); for (let c = Math.min(a, b); c <= Math.max(a, b); c++) s.add(c); return s; };
  return (
    <div className="grid select-none gap-px" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(2.4rem, 1fr))" }} onMouseUp={() => setDrag(null)} onMouseLeave={() => setDrag(null)}>
      {Array.from({ length: 512 }, (_, i) => i + 1).map((ch) => {
        const v = get(ch);
        return (
          <button key={ch} type="button" title={names?.[ch] ? `${ch} · ${names[ch]}` : `Kanal ${ch}`}
            onMouseDown={(e) => { setDrag(ch); onSel(e.shiftKey || e.ctrlKey ? new Set([...sel, ch]) : new Set([ch])); }}
            onMouseEnter={() => drag !== null && onSel(range(drag, ch))}
            className={`relative h-9 overflow-hidden rounded-sm border text-[10px] leading-none ${sel.has(ch) ? "border-primary ring-1 ring-primary" : "border-border"} ${v === undefined ? "bg-muted/30 text-muted-foreground" : "bg-card"}`}>
            {v !== undefined && <span className="absolute inset-x-0 bottom-0 bg-primary/50" style={{ height: `${(v / 255) * 100}%` }} />}
            <span className="relative block pt-0.5 font-mono">{ch}</span>
            {v !== undefined && <span className="relative block font-semibold">{pct(v)}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Fader({ ch, v, label, raw, onChange, onRemove, onLabel }: { ch: number; v: number; label?: string | undefined; raw: boolean; onChange: (v: number) => void; onRemove?: () => void; onLabel?: (s: string) => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-border py-1">
      <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">Ch {ch}</span>
      {onLabel ? <input className="w-32 shrink-0 rounded border border-input bg-background px-1.5 py-0.5 text-xs" placeholder="Navn" value={label ?? ""} onChange={(e) => onLabel(e.target.value)} /> : <span className="w-32 shrink-0 truncate text-xs">{label}</span>}
      <input type="range" min={0} max={255} value={Math.round(v)} onChange={(e) => onChange(Number(e.target.value))} onDoubleClick={() => onChange(0)} className="min-w-0 flex-1 accent-primary" aria-label={`Kanal ${ch}`} />
      <input className="w-14 rounded border border-input bg-background px-1 py-0.5 text-right font-mono text-xs" value={show255(v, raw)}
        onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) onChange(Math.max(0, Math.min(255, Math.round(raw ? n : (n / 100) * 255)))); }} />
      {onRemove && <button type="button" onClick={onRemove} className="text-xs text-muted-foreground hover:text-destructive" title="Fjern kanal">✕</button>}
    </div>
  );
}

function QuickInput({ onApply }: { onApply: (m: Map<number, number> | "clear") => void }) {
  const [q, setQ] = useState(""); const [bad, setBad] = useState(false);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const r = parseQuick(q); if (!r) { setBad(true); return; } setBad(false); onApply(r); setQ(""); }} className="flex gap-2">
      <input className={`${inp} font-mono ${bad ? "border-destructive" : ""}`} placeholder="1-4 @ 80   ·   10 @ 255 dmx   ·   clear" value={q} onChange={(e) => { setQ(e.target.value); setBad(false); }} />
      <button type="submit" className={btn}>Sæt</button>
    </form>
  );
}

/** The 💡 Lys tab of a DMX cue. */
export function DmxCueEditor({ cue, show, set, onFire }: { cue: DmxCue; show: Show; set: (p: Partial<DmxCue>) => void; onFire: () => void }) {
  const raw = useRaw();
  const [grid, setGrid] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const names = show.dmx?.names ?? {};
  const vals = [...cue.values].sort((a, b) => a.ch - b.ch);
  const upd = (m: Map<number, number>) => {
    const map = new Map(cue.values.map((x) => [x.ch, x]));
    for (const [ch, v] of m) map.set(ch, { ...(map.get(ch) ?? { ch }), ch, v });
    set({ values: [...map.values()] });
  };
  const live = (ch: number, v: number) => { upd(new Map([[ch, v]])); dmx.set(ch, v); };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">Fade-tid (s)
          <input type="number" step={0.1} min={0} className={`${inp} w-24`} value={cue.fade} onChange={(e) => set({ fade: Math.max(0, Number(e.target.value) || 0) })} />
        </label>
        <label className="flex items-center gap-2 pb-1 text-sm" title="Til: alle kanaler som ikke står i cuet går til 0. Fra: kun kanalerne i cuet ændres.">
          <input type="checkbox" checked={!!cue.full} onChange={(e) => set({ full: e.target.checked })} /> Hel scene (sluk resten)
        </label>
        <label className="flex items-center gap-2 pb-1 text-sm"><input type="checkbox" checked={raw} onChange={(e) => setRaw(e.target.checked)} /> Vis 0-255</label>
      </div>
      <QuickInput onApply={(r) => (r === "clear" ? set({ values: [] }) : upd(r))} />
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={btn} onClick={() => upd(new Map(vals.map((x) => [x.ch, 255])))}>Alle fuld</button>
        <button type="button" className={btn} onClick={() => upd(new Map(vals.map((x) => [x.ch, 0])))}>Alle 0</button>
        <button type="button" className={btn} title="Kopiér alle kanaler som er tændt lige nu ind i cuet" onClick={() => { const m = new Map<number, number>(); for (let c = 1; c <= 512; c++) if (dmx.levels[c]! > 0) m.set(c, Math.round(dmx.levels[c]!)); set({ values: [...m].map(([ch, v]) => ({ ch, v, ...(cue.values.find((x) => x.ch === ch)?.label ? { label: cue.values.find((x) => x.ch === ch)!.label! } : {}) })) }); }}>📸 Fang aktuelt lys</button>
        <button type="button" className={btn} onClick={onFire}>▶ Test cue</button>
        <button type="button" className={btn} onClick={() => dmx.blackout(0)}>Blackout</button>
        <button type="button" className={`${btn} ml-auto`} onClick={() => setGrid((g) => !g)}>{grid ? "Skjul 512-gitter" : "▦ Vis alle 512 kanaler"}</button>
      </div>
      {vals.length === 0 && <p className="rounded border border-dashed border-border p-3 text-sm text-muted-foreground">Ingen kanaler endnu. Skriv f.eks. <span className="font-mono">1-6 @ 100</span> ovenfor, eller åbn 512-gitteret og vælg kanaler.</p>}
      <div>{vals.map((x) => <Fader key={x.ch} ch={x.ch} v={x.v} raw={raw} label={x.label ?? names[x.ch]} onChange={(v) => live(x.ch, v)}
        onLabel={(s) => set({ values: cue.values.map((y) => (y.ch === x.ch ? (s ? { ...y, label: s } : { ch: y.ch, v: y.v }) : y)) })}
        onRemove={() => set({ values: cue.values.filter((y) => y.ch !== x.ch) })} />)}</div>
      {grid && <>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{sel.size ? `${sel.size} valgt` : "Klik eller træk for at vælge kanaler (Shift = tilføj)"}</span>
          {sel.size > 0 && <>{[100, 75, 50, 25, 0].map((p) => <button key={p} type="button" className={btn} onClick={() => upd(new Map([...sel].map((c) => [c, Math.round((p / 100) * 255)])))}>{p}%</button>)}
            <button type="button" className={btn} onClick={() => { set({ values: cue.values.filter((y) => !sel.has(y.ch)) }); }}>Fjern fra cue</button></>}
        </div>
        <Grid get={(ch) => cue.values.find((x) => x.ch === ch)?.v} sel={sel} onSel={setSel} names={names} />
      </>}
    </div>
  );
}

/** Floating DMX monitor: live 512 levels plus manual test faders. */
export function DmxMonitor({ show }: { show: Show }) {
  const levels = useLevels();
  const raw = useRaw();
  const [sel, setSel] = useState<Set<number>>(new Set());
  const names = show.dmx?.names ?? {};
  const s = { ...DMX_DEFAULTS, ...show.dmx };
  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{s.protocol === "sacn" ? "sACN" : "Art-Net"} · univers {s.universe} · {s.host || "multicast"}</span>
        <button type="button" className={`${btn} ml-auto`} onClick={() => dmx.blackout(0)}>Blackout</button>
        <button type="button" className={btn} onClick={() => dmx.blackout(2)}>Fade ud 2s</button>
      </div>
      {sel.size > 0 && <div className="rounded border border-border p-2">
        {[...sel].sort((a, b) => a - b).slice(0, 24).map((ch) => <Fader key={ch} ch={ch} v={levels[ch]!} raw={raw} label={names[ch]} onChange={(v) => dmx.set(ch, v)} />)}
        {sel.size > 24 && <p className="pt-1 text-xs text-muted-foreground">+{sel.size - 24} flere – sæt dem samlet:</p>}
        <div className="flex gap-1.5 pt-1">{[100, 50, 0].map((p) => <button key={p} type="button" className={btn} onClick={() => sel.forEach((c) => dmx.set(c, Math.round((p / 100) * 255)))}>{p}%</button>)}</div>
      </div>}
      <Grid get={(ch) => (levels[ch]! > 0 || sel.has(ch) ? levels[ch]! : undefined)} sel={sel} onSel={setSel} names={names} />
    </div>
  );
}

/** Settings tab: protocol, address, universe, rate and channel names. */
export function DmxSettingsSection({ show, setShow }: { show: Show; setShow: (s: Show) => void }) {
  const s = { ...DMX_DEFAULTS, ...show.dmx };
  const put = (p: Partial<typeof s>) => setShow({ ...show, dmx: { ...s, ...p } });
  const [nameCh, setNameCh] = useState(1);
  const names = s.names ?? {};
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold">Protokol
          <select className={inp} value={s.protocol} onChange={(e) => { const protocol = e.target.value as "artnet" | "sacn"; put({ protocol, host: protocol === "sacn" ? "" : "2.255.255.255" }); }}>
            <option value="artnet">Art-Net (port 6454)</option><option value="sacn">sACN / E1.31 (port 5568)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Send til (IP)
          <input className={inp} value={s.host} placeholder={s.protocol === "sacn" ? "Tom = multicast" : "2.255.255.255"} onChange={(e) => put({ host: e.target.value.trim() })} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Univers
          <input type="number" min={1} max={4} className={inp} value={s.universe} onChange={(e) => put({ universe: Math.max(1, Math.min(4, Number(e.target.value) || 1)) })} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Opdatering
          <select className={inp} value={s.hz} onChange={(e) => put({ hz: Number(e.target.value) })}><option value={30}>30 Hz</option><option value={40}>40 Hz</option><option value={44}>44 Hz</option></select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">Forbind PC'en med netværkskabel til en DMX-boks (Art-Net/sACN node) eller direkte til lamper med netværksport. Broadcast-adresser som 2.255.255.255 eller 192.168.1.255 når alle bokse på nettet. DMX sendes kun fra Windows-appen.</p>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Kanalnavne</h3>
        <div className="mb-2 flex gap-2">
          <input type="number" min={1} max={512} className={`${inp} w-20`} value={nameCh} onChange={(e) => setNameCh(Math.max(1, Math.min(512, Number(e.target.value) || 1)))} />
          <input className={inp} placeholder="f.eks. Frontlys venstre" value={names[nameCh] ?? ""} onChange={(e) => { const n = { ...names }; if (e.target.value) n[nameCh] = e.target.value; else delete n[nameCh]; put({ names: n }); }} />
        </div>
        {Object.entries(names).map(([ch, n]) => <div key={ch} className="flex gap-2 text-xs"><span className="w-10 font-mono text-muted-foreground">{ch}</span><button type="button" className="hover:underline" onClick={() => setNameCh(Number(ch))}>{n}</button></div>)}
      </div>
    </div>
  );
}
