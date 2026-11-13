import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Cue, MonitorProfile } from "@/lib/show/types";

export function MonitorNotes({ cue, monitors = [], onChange }: { cue: Cue; monitors?: MonitorProfile[]; onChange: (patch: Partial<Cue>) => void }) {
  const [tab, setTab] = useState("");
  const selected = monitors.some((m) => m.id === tab) ? tab : "";
  return <section className="flex min-w-0 flex-col gap-2">
    <div role="tablist" aria-label="Cue-noter" className="flex flex-wrap gap-1">
      {[{ id: "", name: "Fælles" }, ...monitors].map((m) => <Button key={m.id} role="tab" aria-selected={selected === m.id} variant={selected === m.id ? "default" : "secondary"} size="sm" onClick={() => setTab(m.id)}>
        {m.name}{(m.id ? cue.monitorNotes?.[m.id]?.trim() : cue.notes?.trim()) ? " •" : ""}
      </Button>)}
    </div>
    <textarea aria-label={selected ? `Noter til ${monitors.find((m) => m.id === selected)?.name}` : "Fælles noter"} rows={5} className="w-full rounded border border-input bg-input p-3 text-base outline-none focus:border-ring" value={selected ? cue.monitorNotes?.[selected] ?? "" : cue.notes ?? ""} onChange={(e) => onChange(selected ? { monitorNotes: { ...cue.monitorNotes, [selected]: e.target.value } } : { notes: e.target.value })} />
  </section>;
}