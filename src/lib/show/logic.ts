import type { Cue, CueType, MidiMsg, Show } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const TYPE_LABEL: Record<CueType, string> = {
  audio: "Lyd",
  midi: "MIDI",
  fade: "Fade",
  stop: "Stop",
  pause: "Pause",
  wait: "Vent",
  memo: "Memo",
};

export const DEFAULT_TYPE_COLORS: Record<CueType, string> = {
  audio: "#22c55e",
  midi: "#3b82f6",
  fade: "#f59e0b",
  stop: "#ef4444",
  pause: "#a855f7",
  wait: "#94a3b8",
  memo: "#facc15",
};

export function cueColor(show: Show, cue: Cue): string {
  return cue.color || show.typeColors[cue.type] || DEFAULT_TYPE_COLORS[cue.type];
}

export const flatten = (show: Show): Cue[] => show.songs.flatMap((s) => s.cues);

/** Index of the next cue waiting for GO after firing `fired` (and its auto-follow chain). -1 if none. */
export function nextStandbyIndex(flat: Cue[], fired: number): number {
  let j = fired;
  while (j < flat.length && flat[j].follow !== "manual") j++;
  return j + 1 < flat.length ? j + 1 : -1;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v || 0)));

export function midiBytes(m: MidiMsg): number[] {
  const ch = clamp(m.channel, 1, 16) - 1;
  const d1 = clamp(m.data1, 0, 127);
  const d2 = clamp(m.data2, 0, 127);
  switch (m.kind) {
    case "noteon":
      return [0x90 | ch, d1, d2];
    case "noteoff":
      return [0x80 | ch, d1, d2];
    case "cc":
      return [0xb0 | ch, d1, d2];
    case "pc":
      return [0xc0 | ch, d1];
  }
}

export const dbToGain = (db: number) => (db <= -60 ? 0 : Math.pow(10, db / 20));

export function fmt(sec: number | null | undefined): string {
  if (sec == null || !isFinite(sec)) return "--:--";
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${String(m).padStart(2, "0")}:${r.toFixed(1).padStart(4, "0")}`;
}

export function newCue(type: CueType): Cue {
  const base = { id: uid(), name: TYPE_LABEL[type], follow: "manual" as const, preWait: 0, postWait: 0 };
  switch (type) {
    case "audio":
      return { ...base, type, fileId: null, fileName: "", volume: 0, pan: 0, fadeIn: 0, fadeOut: 0, loop: false, outputId: "" };
    case "midi":
      return { ...base, type, messages: [newMidiMsg()] };
    case "fade":
      return { ...base, type, target: "all", volume: -60, duration: 3, stopAfter: true };
    case "stop":
      return { ...base, type, target: "all", duration: 0 };
    case "pause":
      return { ...base, type, target: "all" };
    case "wait":
      return { ...base, type, duration: 5 };
    case "memo":
      return { ...base, type, text: "" };
  }
}

export const newMidiMsg = (): MidiMsg => ({ id: uid(), port: "", kind: "noteon", channel: 1, data1: 60, data2: 127 });

export function emptyShow(): Show {
  return {
    version: 1,
    name: "Nyt show",
    panicFade: 2,
    typeColors: {},
    songs: [{ id: uid(), name: "Sang 1", cues: [] }],
  };
}

export function moveCue(show: Show, cueId: string, toSong: string, beforeId: string | null): Show {
  let moving: Cue | undefined;
  const songs = show.songs.map((s) => ({
    ...s,
    cues: s.cues.filter((c) => (c.id === cueId ? ((moving = c), false) : true)),
  }));
  if (!moving) return show;
  const target = songs.find((s) => s.id === toSong);
  if (!target) return show;
  const idx = beforeId ? target.cues.findIndex((c) => c.id === beforeId) : -1;
  if (idx < 0) target.cues.push(moving);
  else target.cues.splice(idx, 0, moving);
  return { ...show, songs };
}

export function moveSong(show: Show, songId: string, beforeId: string | null): Show {
  const song = show.songs.find((s) => s.id === songId);
  if (!song || songId === beforeId) return show;
  const rest = show.songs.filter((s) => s.id !== songId);
  const idx = beforeId ? rest.findIndex((s) => s.id === beforeId) : -1;
  if (idx < 0) rest.push(song);
  else rest.splice(idx, 0, song);
  return { ...show, songs: rest };
}

export function parseShow(text: string): Show {
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.songs)) throw new Error("Ugyldig show-fil");
  return { ...emptyShow(), ...d, typeColors: d.typeColors ?? {} };
}
