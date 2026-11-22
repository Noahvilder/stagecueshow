import { useMemo, useState } from "react";
import type { Show } from "@/lib/show/types";
import { findReplace, type FrMode } from "@/lib/show/findReplace";
import { slotLabel, slots, type PatchKind } from "@/lib/show/patch";
import { useTrApp } from "@/lib/show/appI18n";

type Output = { id: string; label: string };
type Props = { show: Show; outputs: Output[]; midiPorts: string[]; onApply: (s: Show) => void; onGo: (id: string) => void; onClose: () => void };

const MODES: [FrMode, string][] = [["midiPort", "🎹 MIDI-udgang"], ["audioOut", "🔊 Lydudgang"], ["midiCh", "🎛️ MIDI-kanal"], ["text", "📝 Tekst"]];

/** Ports/outputs already used in the show plus all patch slots and connected hardware. */
function options(show: Show, kind: PatchKind, hw: Output[]): Output[] {
  const map = new Map<string, string>();
  slots(show, kind).forEach((s, i) => map.set(`#${i + 1}`, slotLabel(i + 1, s, kind)));
  const walk = (cs: Show["songs"][number]["cues"]) => cs.forEach((c) => {
    if (kind === "midi" && c.type === "midi") c.messages.forEach((m) => { if (!map.has(m.port)) map.set(m.port, m.port || "(ingen)"); });
    if (kind === "audio" && c.type === "audio" && !map.has(c.outputId)) map.set(c.outputId, c.outputId || "Standard / PA");
    if (c.type === "group") walk(c.children);
  });
  show.songs.forEach((sg) => walk(sg.cues));
  hw.forEach((o) => { if (!map.has(o.id)) map.set(o.id, o.label); });
  return [...map].map(([id, label]) => ({ id, label }));
}

export function FindReplace({ show, outputs, midiPorts, onApply, onGo, onClose }: Props) {
  const tr = useTrApp();
  const [mode, setMode] = useState<FrMode>("midiPort");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cs, setCs] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const opts = useMemo(() => mode === "midiPort" ? options(show, "midi", midiPorts.map((p) => ({ id: p, label: p }))) : mode === "audioOut" ? options(show, "audio", outputs) : [], [mode, show, midiPorts, outputs]);
  const q = { mode, from, to, caseSensitive: cs };
  const preview = useMemo(() => (mode === "text" && !from) || (mode !== "text" && from === "" && mode === "midiCh") ? { hits: [] } : findReplace(show, q), [show, mode, from, to, cs]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = preview.hits.reduce((a, h) => a + h.count, 0);
  const songs = new Set(preview.hits.map((h) => h.song)).size;
  const same = from === to;
  const apply = () => { const r = findReplace(show, q); onApply(r.show); setDone(`✓ ${total} ${tr("ændringer gemt")}`); };
  const pick = (v: string, set: (s: string) => void) => mode === "midiCh"
    ? <input type="number" min={1} max={16} value={v} onChange={(e) => { set(e.target.value); setDone(null); }} className="w-full rounded border border-input bg-input px-2 py-1" />
    : mode === "text"
    ? <input value={v} onChange={(e) => { set(e.target.value); setDone(null); }} className="w-full rounded border border-input bg-input px-2 py-1" />
    : <select value={v} onChange={(e) => { set(e.target.value); setDone(null); }} className="w-full rounded border border-input bg-input px-2 py-1">{opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-4" onClick={(e) => e.stopPropagation()} data-shortcut-capture>
        <div className="flex items-center justify-between"><h2 className="text-lg font-black">🔍 {tr("Find & erstat")}</h2><button onClick={onClose} title={tr("Luk")}>✕</button></div>
        <div className="flex flex-wrap gap-1">{MODES.map(([m, l]) => <button key={m} onClick={() => { setMode(m); const d = m === "midiCh" ? "1" : ""; setFrom(d); setTo(d); setDone(null); }} className={`rounded px-2 py-1 text-sm font-semibold ${mode === m ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{tr(l)}</button>)}</div>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase text-muted-foreground">
          <label className="flex flex-col gap-1">{tr("Find")}{pick(from, setFrom)}</label>
          <label className="flex flex-col gap-1">{tr("Erstat med")}{pick(to, setTo)}</label>
        </div>
        {mode === "text" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cs} onChange={(e) => setCs(e.target.checked)} />{tr("Skeln mellem store og små bogstaver")}</label>}
        <div className="text-sm font-semibold">{tr("Fundet")} {total} {tr("ændringer i")} {preview.hits.length} cues ({songs} {tr("sange")})</div>
        <div className="min-h-0 flex-1 overflow-auto rounded border border-border">
          {preview.hits.map((h) => (
            <button key={h.cueId} onClick={() => onGo(h.cueId)} title={tr("Gå til cue")} className="flex w-full justify-between border-b border-border px-2 py-1 text-left text-sm hover:bg-accent">
              <span>🎯 {h.cueName}</span><span className="text-muted-foreground">{h.song} · {h.count}×</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2">
          {done && <span className="mr-auto text-sm font-bold text-primary">{done}</span>}
          <button onClick={onClose} className="rounded bg-secondary px-3 py-1.5 text-sm">{tr("Luk")}</button>
          <button disabled={!total || same} onClick={apply} className="rounded bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-40">{tr("Erstat alle")}</button>
        </div>
      </div>
    </div>
  );
}
