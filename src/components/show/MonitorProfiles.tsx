import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeMonitor } from "@/lib/show/monitors";
import { uid } from "@/lib/show/logic";
import type { Show } from "@/lib/show/types";

export function MonitorProfiles({ show, onChange }: { show: Show; onChange: (show: Show) => void }) {
  return <section className="flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2"><h3 className="font-bold text-standby">Scenemonitors</h3><Button variant="secondary" size="sm" onClick={() => onChange({ ...show, monitors: [...(show.monitors ?? []), { id: uid(), name: "Ny monitor", mode: "lyrics" }] })}><Plus /> Monitor</Button></div>
    {(show.monitors ?? []).map((m) => <div key={m.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2">
      <input aria-label={`Monitornavn ${m.name}`} className="min-w-0 flex-1 rounded border border-input bg-input p-2" value={m.name} onChange={(e) => onChange({ ...show, monitors: show.monitors?.map((x) => x.id === m.id ? { ...x, name: e.target.value } : x) })} />
      <select aria-label={`Visning for ${m.name}`} className="rounded border border-input bg-input p-2" value={m.mode} onChange={(e) => onChange({ ...show, monitors: show.monitors?.map((x) => x.id === m.id ? { ...x, mode: e.target.value === "hud" ? "hud" : "lyrics" } : x) })}><option value="lyrics">Lyrics & akkorder</option><option value="hud">Nu & Næste / noter</option></select>
      <Button variant="ghost" size="icon" title={`Slet ${m.name}`} aria-label={`Slet monitor ${m.name}`} onClick={() => { if (confirm(`Slet monitoren ${m.name} og dens personlige noter?`)) onChange(removeMonitor(show, m.id)); }}><Trash2 /></Button>
    </div>)}
  </section>;
}