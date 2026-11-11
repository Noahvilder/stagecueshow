import type { MidiKind, Cue, CueType, MidiMsg, Show } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const TYPE_LABEL: Record<CueType, string> = {
  audio: "Lyd",
  midi: "MIDI",
  fade: "Fade",
  stop: "Stop",
  pause: "Pause",
  wait: "Vent",
  memo: "Memo",
  group: "Gruppe",
};

export const DEFAULT_TYPE_COLORS: Record<CueType, string> = {
  audio: "#22c55e",
  midi: "#3b82f6",
  fade: "#f59e0b",
  stop: "#ef4444",
  pause: "#a855f7",
  wait: "#94a3b8",
  memo: "#facc15",
  group: "#ec4899",
};

export function cueColor(show: Show, cue: Cue): string {
  return cue.color || show.typeColors[cue.type] || DEFAULT_TYPE_COLORS[cue.type];
}

export const flatten = (show: Show): Cue[] => show.songs.flatMap((s) => s.cues);

/** Cues including the children of group cues (for target lists / preloading). */
export const deepCues = (cues: Cue[]): Cue[] => cues.flatMap((c) => (c.type === "group" ? [c, ...deepCues(c.children)] : [c]));

/** Longest pre-wait + duration among a group's children. */
export function groupDuration(children: Cue[], dur: (c: Cue) => number): number {
  return children.reduce((m, c) => Math.max(m, c.preWait + dur(c)), 0);
}

/** Index of the next cue waiting for GO after firing `fired` (and its auto-follow chain). -1 if none. */
export function nextStandbyIndex(flat: Cue[], fired: number): number {
  let j = fired;
  while (j < flat.length && flat[j]!.follow !== "manual") j++;
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
    case "polyat":
      return [0xa0 | ch, d1, d2];
    case "chanat":
      return [0xd0 | ch, d1];
    case "pitchbend": {
      const v = clamp(m.data1, 0, 16383);
      return [0xe0 | ch, v & 0x7f, v >> 7];
    }
    case "start":
      return [0xfa];
    case "continue":
      return [0xfb];
    case "stop":
      return [0xfc];
    case "clock":
      return [0xf8];
  }
}

type Field = { label: string; max: number; note?: boolean };
/** UI metadata for every MIDI message kind (shared by PC and phone editors). */
export const MIDI_KINDS: { kind: MidiKind; label: string; channel: boolean; d1?: Field; d2?: Field; def1?: number; def2?: number }[] = [
  { kind: "noteon", label: "Note On", channel: true, d1: { label: "Note", max: 127, note: true }, d2: { label: "Velocity", max: 127 } },
  { kind: "noteoff", label: "Note Off", channel: true, d1: { label: "Note", max: 127, note: true }, d2: { label: "Velocity", max: 127 } },
  { kind: "cc", label: "Control Change (CC)", channel: true, d1: { label: "CC#", max: 127 }, d2: { label: "Værdi", max: 127 } },
  { kind: "pc", label: "Program Change", channel: true, d1: { label: "Program", max: 127 } },
  { kind: "polyat", label: "Poly Aftertouch", channel: true, d1: { label: "Note", max: 127, note: true }, d2: { label: "Tryk", max: 127 } },
  { kind: "chanat", label: "Channel Aftertouch", channel: true, d1: { label: "Tryk", max: 127 } },
  { kind: "pitchbend", label: "Pitch Bend", channel: true, d1: { label: "Værdi (8192 = midt)", max: 16383 }, def1: 8192 },
  { kind: "start", label: "Start (transport)", channel: false },
  { kind: "stop", label: "Stop (transport)", channel: false },
  { kind: "continue", label: "Continue (transport)", channel: false },
  { kind: "clock", label: "Clock tick", channel: false },
];
export const midiKindInfo = (k: MidiKind) => MIDI_KINDS.find((x) => x.kind === k) ?? MIDI_KINDS[0]!;
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
/** 60 → "C4" */
export const noteName = (n: number) => `${NOTES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;

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
    case "group":
      return { ...base, type, children: [] };
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

/** Playable [start, end] window of an audio file after trim. */
export function trimSpan(dur: number, startTime = 0, endTime = 0): { start: number; end: number; len: number } {
  const start = Math.max(0, Math.min(startTime || 0, Math.max(0, dur - 0.01)));
  let end = endTime && endTime > 0 ? Math.min(endTime, dur) : dur;
  if (end <= start) end = dur;
  return { start, end, len: end - start };
}
