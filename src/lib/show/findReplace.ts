import type { Cue, Show } from "./types";

export type FrMode = "midiPort" | "audioOut" | "midiCh" | "text";
export interface FrQuery { mode: FrMode; from: string; to: string; caseSensitive?: boolean }
export interface FrHit { cueId: string; cueName: string; song: string; count: number }

const TEXT_KEYS = ["name", "notes", "stikord"] as const;

function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/** Applies the query to one cue (not its children). Returns new cue + number of changes. */
function applyOne(c: Cue, q: FrQuery): [Cue, number] {
  if (q.mode === "midiPort" && c.type === "midi") {
    let n = 0;
    const messages = c.messages.map((m) => (m.port === q.from ? (n++, { ...m, port: q.to }) : m));
    return [n ? { ...c, messages } : c, n];
  }
  if (q.mode === "midiCh" && c.type === "midi") {
    const f = Number(q.from), t = Number(q.to);
    let n = 0;
    const messages = c.messages.map((m) => (m.channel === f ? (n++, { ...m, channel: t }) : m));
    return [n ? { ...c, messages } : c, n];
  }
  if (q.mode === "audioOut" && c.type === "audio") {
    return c.outputId === q.from ? [{ ...c, outputId: q.to }, 1] : [c, 0];
  }
  if (q.mode === "text" && q.from) {
    const re = new RegExp(esc(q.from), q.caseSensitive ? "g" : "gi");
    let n = 0;
    const out: Record<string, unknown> = { ...c };
    for (const k of TEXT_KEYS) {
      const v = c[k];
      if (typeof v !== "string") continue;
      const m = v.match(re);
      if (m) { n += m.length; out[k] = v.replace(re, () => q.to); }
    }
    return [n ? (out as unknown as Cue) : c, n];
  }
  return [c, 0];
}

function walk(c: Cue, q: FrQuery, song: string, hits: FrHit[]): Cue {
  let [nc, n] = applyOne(c, q);
  if (n) hits.push({ cueId: c.id, cueName: c.name, song, count: n });
  if (nc.type === "group") nc = { ...nc, children: nc.children.map((k) => walk(k, q, song, hits)) };
  return nc;
}

/** Runs find & replace over every song, cue and group child. */
export function findReplace(show: Show, q: FrQuery): { show: Show; hits: FrHit[] } {
  const hits: FrHit[] = [];
  const songs = show.songs.map((sg) => ({ ...sg, cues: sg.cues.map((c) => walk(c, q, sg.name, hits)) }));
  return { show: { ...show, songs }, hits };
}
