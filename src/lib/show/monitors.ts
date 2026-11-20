import type { Cue, MonitorProfile, Show } from "./types";

export const defaultMonitors = (): MonitorProfile[] => [
  { id: "singer", name: "Forsanger", mode: "lyrics" },
  { id: "guitar", name: "Guitar", mode: "lyrics" },
  { id: "bass", name: "Bas", mode: "lyrics" },
  { id: "keys", name: "Keys", mode: "lyrics" },
  { id: "drums", name: "Trommer", mode: "hud" },
  { id: "tech", name: "Lys / Teknik", mode: "hud" },
];

export function monitorBody(cue: { notes?: string; text?: string; monitorNotes?: Record<string, string> } | undefined, id?: string): string {
  const personal = id ? cue?.monitorNotes?.[id] : undefined;
  return personal?.trim() ? personal : [cue?.text, cue?.notes].filter(Boolean).join("\n\n");
}

export function removeMonitor(show: Show, id: string): Show {
  const clean = (cue: Cue): Cue => {
    const monitorNotes = { ...cue.monitorNotes };
    delete monitorNotes[id];
    return cue.type === "group" ? { ...cue, monitorNotes, children: cue.children.map(clean) } : { ...cue, monitorNotes };
  };
  return { ...show, monitors: (show.monitors ?? []).filter((m) => m.id !== id), songs: show.songs.map((song) => ({ ...song, cues: song.cues.map(clean) })) };
}
/** Monitor-visible fields for a cue. Groups show only children that have started by `elapsed`
 * seconds after group-GO (default 0 = not started yet); the latest started memo/note wins. */
export function monitorFields(c: Cue, elapsed = 0): { text: string; notes: string; monitorNotes: Record<string, string> } {
  if (c.type !== "group") return { text: c.type === "memo" ? c.text : "", notes: c.notes ?? "", monitorNotes: c.monitorNotes ?? {} };
  const kids = c.children.filter((k) => (k.preWait ?? 0) <= elapsed).map((k) => monitorFields(k, elapsed - (k.preWait ?? 0)));
  let text = ""; let notes = "";
  const monitorNotes: Record<string, string> = { ...(c.monitorNotes ?? {}) };
  for (const k of kids) {
    if (k.text.trim()) text = k.text;
    if (k.notes.trim()) notes = k.notes;
    for (const [id, t] of Object.entries(k.monitorNotes)) if (t.trim()) monitorNotes[id] = t;
  }
  return { text, notes: [c.notes ?? "", notes].filter((x) => x.trim()).join("\n\n"), monitorNotes };
}

/** How many seconds of a live group have "revealed" children – snapped to the last child start so state only changes at child starts. */
export function revealedAt(c: Cue | undefined, elapsed: number): number {
  if (!c || c.type !== "group") return 0;
  return c.children.reduce((m, k) => ((k.preWait ?? 0) <= elapsed ? Math.max(m, k.preWait ?? 0) : m), 0);
}

/** Sticky memo: the cue whose text stays on screen – the standby cue if it has text, else the latest earlier one. */
export function stickyIndex<T extends { notes?: string; text?: string; monitorNotes?: Record<string, string> }>(flat: T[], idx: number, id?: string): number {
  for (let i = idx; i >= 0; i--) if (monitorBody(flat[i], id).trim()) return i;
  return idx;
}
