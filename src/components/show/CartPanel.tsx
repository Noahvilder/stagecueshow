import { useEffect, useRef, useState } from "react";
import type { CartPad, Show } from "@/lib/show/types";
import { ioName } from "@/lib/show/types";
import { slotLabel, slotRef, slots } from "@/lib/show/patch";
import { PAD_COLORS, keyTaken, padForKey } from "@/lib/show/cart";

interface Props {
  show: Show;
  pads: CartPad[];
  setPads: (fn: (p: CartPad[]) => CartPad[]) => void;
  locked: boolean;
  outputs: { id: string; label: string }[];
  playing: Set<string>;
  onFire: (p: CartPad) => void;
  onStop: (id: string) => void;
  onAddFiles: (files: File[]) => void;
}

const inp = "w-full rounded border border-border bg-background px-2 py-1 text-sm";

/** Soundboard grid: tap a pad to play, tap again to stop. Each pad has its own output. */
export function CartPanel({ show, pads, setPads, locked, outputs, playing, onFire, onStop, onAddFiles }: Props) {
  const [edit, setEdit] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hit = (p: CartPad) => (playing.has(p.id) ? onStop(p.id) : onFire(p));
  const hitRef = useRef(hit); hitRef.current = hit;
  const padsRef = useRef(pads); padsRef.current = pads;

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName)))) return;
      const p = padForKey(padsRef.current, e.key);
      if (p) { e.preventDefault(); e.stopPropagation(); hitRef.current(p); }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, []);

  const cur = pads.find((p) => p.id === edit);
  const set = (patch: Partial<CartPad>) => setPads((ps) => ps.map((p) => (p.id === edit ? { ...p, ...patch } : p)));
  const aSlots = slots(show, "audio");

  return (
    <div className="flex h-full flex-col gap-2 p-2"
      onDragOver={(e) => { if (!locked && e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
      onDrop={(e) => { if (locked) return; e.preventDefault(); onAddFiles(Array.from(e.dataTransfer.files)); }}>
      <div className="grid flex-1 auto-rows-[minmax(4.5rem,1fr)] grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2 overflow-auto">
        {pads.map((p) => {
          const on = playing.has(p.id);
          return (
            <div key={p.id} className="relative">
              <button onClick={() => hit(p)} title={on ? "Stop jingle" : "Afspil jingle"}
                style={{ borderColor: p.color || "var(--border)", background: on ? p.color || "var(--go)" : undefined }}
                className={`flex h-full w-full flex-col items-start justify-between rounded-lg border-2 bg-secondary p-2 text-left font-semibold transition ${on ? "animate-pulse text-background" : "hover:bg-accent"} ${edit === p.id ? "ring-2 ring-ring" : ""}`}>
                <span className="line-clamp-2 text-sm">{p.name || p.fileName || "Tom"}</span>
                <span className="flex w-full justify-between text-xs opacity-75">
                  <span className="truncate">{p.outputId.startsWith("#") ? slotLabel(Number(p.outputId.slice(1)), aSlots[Number(p.outputId.slice(1)) - 1], "audio") : (outputs.find((o) => o.id === p.outputId)?.label ?? "PA")}</span>
                  {p.key && <kbd className="rounded bg-background/60 px-1 uppercase">{p.key}</kbd>}
                </span>
              </button>
              {!locked && <button onClick={() => setEdit(edit === p.id ? null : p.id)} className="absolute right-1 top-1 rounded bg-background/70 px-1 text-xs" title="Redigér jingle" aria-label="Redigér jingle">✎</button>}
            </div>
          );
        })}
        {!locked && (
          <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:bg-accent" title="Tilføj jingles (eller træk lydfiler herind)">
            + Tilføj jingle
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="audio/*" multiple hidden onChange={(e) => { onAddFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      {cur && !locked && (
        <div className="grid grid-cols-2 gap-2 rounded border border-border p-2 text-sm">
          <label className="col-span-2">Navn<input className={inp} value={cur.name} onChange={(e) => set({ name: e.target.value })} /></label>
          <label className="col-span-2">Lydudgang
            <select className={inp} value={cur.outputId} onChange={(e) => set({ outputId: e.target.value })}>
              <option value="">PA (standard)</option>
              {aSlots.length > 0 && <optgroup label="Nummererede udgange">{aSlots.map((sl, i) => <option key={i} value={slotRef(i + 1)}>{slotLabel(i + 1, sl, "audio")}</option>)}</optgroup>}
              {outputs.filter((o) => o.id).map((o) => <option key={o.id} value={o.id}>{ioName(o.label, show.ioAliases?.audio?.[o.id])}</option>)}
            </select>
          </label>
          <label>Kanal (start)<input type="number" min={1} max={64} className={inp} value={cur.channel ?? 1} onChange={(e) => set({ channel: Math.max(1, Number(e.target.value) || 1) })} /></label>
          <label className="flex items-end gap-1 pb-1"><input type="checkbox" checked={!!cur.mono} onChange={(e) => set({ mono: e.target.checked })} /> Mono</label>
          <label>Volumen (dB)<input type="number" step={0.5} min={-60} max={12} className={inp} value={cur.volume} onChange={(e) => set({ volume: Number(e.target.value) || 0 })} /></label>
          <label>Fade ud (s)<input type="number" step={0.1} min={0} className={inp} value={cur.fadeOut} onChange={(e) => set({ fadeOut: Math.max(0, Number(e.target.value) || 0) })} /></label>
          <label>Tast<input maxLength={1} className={inp} value={cur.key ?? ""} placeholder="fx Q"
            onChange={(e) => { const k = e.target.value.slice(-1); if (!keyTaken(pads, k, cur.id)) set({ key: k || undefined } as Partial<CartPad>); }} /></label>
          <label className="flex items-end gap-1 pb-1"><input type="checkbox" checked={cur.loop} onChange={(e) => set({ loop: e.target.checked })} /> Loop</label>
          <div className="col-span-2 flex flex-wrap gap-1">
            {PAD_COLORS.map((c) => <button key={c} onClick={() => set({ color: c })} style={{ background: c }} className={`h-6 w-6 rounded ${cur.color === c ? "ring-2 ring-ring" : ""}`} aria-label={`Farve ${c}`} />)}
          </div>
          <div className="col-span-2 flex justify-between">
            <button className="text-destructive underline" onClick={() => { onStop(cur.id); setPads((ps) => ps.filter((p) => p.id !== cur.id)); setEdit(null); }}>Slet jingle</button>
            <button className="underline" onClick={() => setEdit(null)}>Luk</button>
          </div>
        </div>
      )}
    </div>
  );
}
