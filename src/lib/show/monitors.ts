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