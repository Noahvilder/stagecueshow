import type { Cue, Show } from "./types";

export type PreflightCode = "empty" | "noFile" | "fileMissing" | "badTarget" | "noTarget" | "oscIncomplete" | "midiEmpty";
export interface PreflightIssue { code: PreflightCode; cueId?: string; cueName?: string; text: string }

const TEXT: Record<PreflightCode, string> = {
  empty: "Showet har ingen cues",
  noFile: "Lyd-cue uden lydfil",
  fileMissing: "Lydfilen findes ikke på denne computer",
  badTarget: "Peger på et cue, der ikke findes længere",
  noTarget: "Intet mål valgt",
  oscIncomplete: "OSC mangler adresse, IP eller port",
  midiEmpty: "MIDI-cue uden beskeder",
};

/** Walk every cue in the show, including cues inside groups. */
export function allCues(show: Show): Cue[] {
  const out: Cue[] = [];
  const walk = (l: Cue[]) => l.forEach((c) => { out.push(c); if (c.type === "group") walk(c.children); });
  show.songs.forEach((s) => walk(s.cues));
  return out;
}

/** Static show check before going live. `missingFileIds` = audio files not found locally. */
export function preflight(show: Show, missingFileIds: string[]): PreflightIssue[] {
  const cues = allCues(show);
  if (!cues.length) return [{ code: "empty", text: TEXT.empty }];
  const ids = new Set(cues.map((c) => c.id));
  const missing = new Set(missingFileIds);
  const out: PreflightIssue[] = [];
  const add = (code: PreflightCode, c: Cue) => out.push({ code, cueId: c.id, cueName: c.name, text: TEXT[code] });
  for (const c of cues) {
    if (c.type === "audio") { if (!c.fileId) add("noFile", c); else if (missing.has(c.fileId)) add("fileMissing", c); }
    else if (c.type === "fade" || c.type === "stop" || c.type === "pause") {
      if (!c.target) add("noTarget", c); else if (c.target !== "all" && !ids.has(c.target)) add("badTarget", c);
    } else if (c.type === "osc") { if (!c.address || !c.host || !c.port) add("oscIncomplete", c); }
    else if (c.type === "midi") { if (!c.messages.length) add("midiEmpty", c); }
  }
  return out;
}
