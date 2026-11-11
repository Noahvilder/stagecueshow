export type PedalAction = "go" | "panic" | "next" | "prev";
export type MidiIn = { kind: "cc" | "note" | "pc"; channel: number; data1: number };
export type PedalMap = Partial<Record<PedalAction, MidiIn>>;

export const PEDAL_LABEL: Record<PedalAction, string> = { go: "GO", panic: "Panic", next: "Næste cue", prev: "Forrige cue" };

/** Parse incoming MIDI bytes into a "press" event. Releases (note off / CC 0) return null. */
export function parseMidiIn(b: number[]): MidiIn | null {
  if (b.length < 2) return null;
  const st = b[0]! & 0xf0;
  const channel = (b[0]! & 0x0f) + 1;
  if (st === 0x90 && (b[2] ?? 0) > 0) return { kind: "note", channel, data1: b[1]! };
  if (st === 0xb0 && (b[2] ?? 0) > 0) return { kind: "cc", channel, data1: b[1]! };
  if (st === 0xc0) return { kind: "pc", channel, data1: b[1]! };
  return null;
}

export const sameMidi = (a: MidiIn, b: MidiIn) => a.kind === b.kind && a.channel === b.channel && a.data1 === b.data1;

export function matchPedal(map: PedalMap, ev: MidiIn): PedalAction | null {
  for (const k of Object.keys(map) as PedalAction[]) if (map[k] && sameMidi(map[k]!, ev)) return k;
  return null;
}

export const midiInLabel = (m?: MidiIn) =>
  m ? `${m.kind === "cc" ? "CC" : m.kind === "note" ? "Note" : "PC"} ${m.data1} · kanal ${m.channel}` : "Ikke sat";
