import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TYPE_LABEL, newCue } from "@/lib/show/logic";
import { guidedCueError } from "@/lib/show/workspace";
import type { Cue, CueType, Show } from "@/lib/show/types";

const STEPS = ["Cue-type", "Navn & stikord", "Indstillinger", "Afvikling", "Oversigt"];
const INPUT = "w-full rounded border border-input bg-background px-3 py-2 text-sm";
const TYPES: CueType[] = ["audio", "midi", "osc", "fade", "stop", "pause", "wait", "memo", "dmx", "group"];

export function CueWizard(props: {
  show: Show; initial: Cue | null; sceneId: string; editing: boolean;
  onClose: () => void; onSave: (cue: Cue, file: File | null, sceneId: string) => Promise<void>;
  allowType: (type: CueType) => boolean;
  renderSettings: (cue: Cue, change: (p: Partial<Cue>) => void, onFile: (file: File) => void) => ReactNode;
  renderNotes: (cue: Cue, change: (p: Partial<Cue>) => void) => ReactNode;
}) {
  const [cue, setCue] = useState<Cue | null>(() => props.initial ? structuredClone(props.initial) : null);
  const [step, setStep] = useState(props.editing ? 1 : 0);
  const [sceneId, setSceneId] = useState(props.sceneId);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const change = (patch: Partial<Cue>) => { setError(null); setCue((c) => c ? { ...c, ...patch } as Cue : c); };
  const next = () => {
    if (!cue) return;
    const issue = step === 1 ? (!cue.name.trim() ? "Giv cuet et navn." : null) : step === 2 ? guidedCueError(cue, !!file) : null;
    if (issue) { setError(issue); return; }
    setError(null); setStep((s) => Math.min(4, s + 1));
  };
  const save = async () => {
    if (!cue || busy) return;
    const issue = guidedCueError(cue, !!file);
    if (issue) { setError(issue); return; }
    setBusy(true);
    try { await props.onSave(cue, file, sceneId); props.onClose(); }
    catch { setError("Cuet kunne ikke gemmes. Prøv igen."); setBusy(false); }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) props.onClose(); }}>
    <DialogContent aria-describedby="cue-guide-progress" className="z-[100010] flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden bg-card">
      <DialogHeader className="border-b border-border pb-4 pr-6">
        <DialogTitle>{props.editing ? "Rediger cue" : "Opret cue"} · {STEPS[step]}</DialogTitle>
        <DialogDescription id="cue-guide-progress">Teater & Skole · Trin {step + 1} af {STEPS.length}</DialogDescription>
      </DialogHeader>
      <ol aria-label="Cue-trin" className="grid grid-cols-5 gap-2">{STEPS.map((label, i) => <li key={label} aria-current={i === step ? "step" : undefined} title={label} className={`h-1.5 rounded ${i <= step ? "bg-standby" : "bg-muted"}`} />)}</ol>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {step === 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{TYPES.map((type) => <Button key={type} variant="outline" aria-pressed={cue?.type === type} className={`h-16 whitespace-normal ${cue?.type === type ? "border-standby bg-secondary" : ""}`} onClick={() => {
          if (cue?.type === type || !props.allowType(type)) return;
          setCue(newCue(type, props.show.cueDefaults)); setFile(null); setError(null);
        }}><Plus />{TYPE_LABEL[type]}</Button>)}</div>}
        {step === 1 && cue && <div className="show-settings space-y-4">
          {!props.editing && <label className="setting-field block space-y-1 text-sm font-semibold">Akt/Scene<select aria-label="Akt/Scene" className={INPUT} value={sceneId} onChange={(e) => setSceneId(e.target.value)}>{props.show.songs.map((s) => <option key={s.id} value={s.id}>{s.name.replace(/^Sang (\d+)$/, "Akt/Scene $1")}</option>)}</select></label>}
          <label className="setting-field block space-y-1 text-sm font-semibold">Navn<input autoFocus aria-label="Cue-navn" className={INPUT} value={cue.name} onChange={(e) => change({ name: e.target.value })} /></label>
          <label className="setting-field block space-y-1 text-sm font-semibold">Stikord<input aria-label="Stikord" className={INPUT} value={cue.stikord ?? ""} onChange={(e) => change({ stikord: e.target.value })} /></label>
          <label className="setting-field block space-y-1 text-sm font-semibold">Manuskript-ref<input aria-label="Manuskript-ref" className={INPUT} value={cue.ref ?? ""} onChange={(e) => change({ ref: e.target.value })} /></label>
        </div>}
        {step === 2 && cue && props.renderSettings(cue, change, (f) => { setFile(f); change({ fileId: null, fileName: f.name } as Partial<Cue>); })}
        {step === 3 && cue && <div className="show-settings space-y-4">
          <label className="setting-field block space-y-1 text-sm font-semibold">Forsinkelse efter GO (sekunder)<input aria-label="Forsinkelse efter GO" type="number" min={0} step={0.1} className={INPUT} value={cue.preWait} onChange={(e) => change({ preWait: Math.max(0, Number(e.target.value)) })} /></label>
          <label className="setting-field block space-y-1 text-sm font-semibold">Næste cue<select aria-label="Næste cue" className={INPUT} value={cue.follow} onChange={(e) => change({ follow: e.target.value as Cue["follow"] })}>
            <option value="manual">Manuel – venter på GO</option><option value="withStart">Automatisk, når dette cue starter</option><option value="afterEnd">Automatisk, når dette cue slutter</option>
          </select></label>
          {cue.follow !== "manual" && <label className="setting-field block space-y-1 text-sm font-semibold">Ventetid før næste cue (sekunder)<input aria-label="Ventetid før næste cue" type="number" min={0} step={0.1} className={INPUT} value={cue.postWait} onChange={(e) => change({ postWait: Math.max(0, Number(e.target.value)) })} /></label>}
          <details className="border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold">Noter & monitor</summary><div className="pt-3">{props.renderNotes(cue, change)}</div></details>
        </div>}
        {step === 4 && cue && <dl className="divide-y divide-border text-sm">{[
          ["Akt/Scene", props.show.songs.find((s) => s.id === sceneId)?.name.replace(/^Sang (\d+)$/, "Akt/Scene $1") ?? ""],
          ["Type", TYPE_LABEL[cue.type]], ["Navn", cue.name], ["Stikord", cue.stikord || "—"],
          ...(cue.type === "audio" ? [["Lydfil", cue.fileName], ["Udgang", cue.outputId || "Standard udgang"], ["Volumen", `${cue.volume} dB`]] : []),
          ["Forsinkelse efter GO", `${cue.preWait} s`], ["Næste cue", cue.follow === "manual" ? "Venter på GO" : `${cue.follow === "withStart" ? "Ved start" : "Ved slut"} + ${cue.postWait} s`],
        ].map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="break-words font-semibold">{value}</dd></div>)}</dl>}
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-destructive">{error}</p>}
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button variant="ghost" disabled={busy} onClick={props.onClose}>Annuller</Button>
        <div className="ml-auto flex gap-2"><Button variant="outline" disabled={busy || step <= (props.editing ? 1 : 0)} onClick={() => { setStep((s) => s - 1); setError(null); }}><ArrowLeft />Tilbage</Button>
          {step < 4 ? <Button disabled={!cue} onClick={next}>Næste<ArrowRight /></Button> : <Button disabled={busy} onClick={() => void save()}><Check />{busy ? "Gemmer…" : props.editing ? "Gem cue" : "Opret cue"}</Button>}
        </div>
      </footer>
    </DialogContent>
  </Dialog>;
}