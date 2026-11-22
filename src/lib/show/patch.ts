import type { Cue, Show } from "./types";

/** A numbered output slot stored in the show. Cues point at "#N"; each PC maps N to its own hardware. */
export interface PatchSlot { alias: string; hw: string; hwLabel?: string }
export type PatchKind = "audio" | "midi";

export const SLOT_PREFIX = "#";
export const isSlot = (v: string | undefined) => !!v && v.startsWith(SLOT_PREFIX);
export const slotRef = (n: number) => `${SLOT_PREFIX}${n}`;
export const slotNum = (v: string) => parseInt(v.slice(SLOT_PREFIX.length), 10);

export function slots(show: Show, kind: PatchKind): PatchSlot[] {
  return show.patch?.[kind] ?? [];
}

/**
 * Turn a cue's output value into real hardware. Direct hardware values pass through.
 * For audio, `available` lets us re-find a device by its name when the id changed (new PC).
 */
export function resolveOut(show: Show, kind: PatchKind, value: string, available?: { id: string; label: string }[]): string {
  if (!isSlot(value)) return value;
  const s = slots(show, kind)[slotNum(value) - 1];
  if (!s) return kind === "audio" ? "" : value;
  if (available && s.hw && !available.some((o) => o.id === s.hw) && s.hwLabel) {
    const byName = available.find((o) => o.label === s.hwLabel);
    if (byName) return byName.id;
  }
  return s.hw;
}

export function slotLabel(n: number, s: PatchSlot | undefined, kind: PatchKind): string {
  const base = kind === "audio" ? "Lyd" : "MIDI";
  const alias = s?.alias?.trim();
  const hw = s?.hwLabel || s?.hw || "ikke valgt";
  return `${base} ${n}${alias ? ` · ${alias}` : ""} (${hw})`;
}

function mapCues(cues: Cue[], f: (c: Cue) => Cue): Cue[] {
  return cues.map((c) => {
    const n = f(c);
    return n.type === "group" ? { ...n, children: mapCues(n.children, f) } : n;
  });
}

/** Give every hardware port used directly in cues a number, and point the cues at that number. */
export function numberExisting(show: Show, labels: Record<string, string> = {}): Show {
  const audio = [...slots(show, "audio")];
  const midi = [...slots(show, "midi")];
  const take = (list: PatchSlot[], hw: string, label?: string) => {
    let i = list.findIndex((s) => s.hw === hw);
    if (i < 0) { list.push({ alias: "", hw, ...(label ? { hwLabel: label } : {}) }); i = list.length - 1; }
    return slotRef(i + 1);
  };
  const songs = show.songs.map((sg) => ({
    ...sg,
    cues: mapCues(sg.cues, (c) => {
      if (c.type === "audio" && !isSlot(c.outputId)) return { ...c, outputId: take(audio, c.outputId, labels[c.outputId] ?? (c.outputId ? undefined : "Standard")) };
      if (c.type === "midi") return { ...c, messages: c.messages.map((m) => (m.port && !isSlot(m.port) ? { ...m, port: take(midi, m.port, m.port) } : m)) };
      return c;
    }),
  }));
  return { ...show, songs, patch: { audio, midi } };
}
