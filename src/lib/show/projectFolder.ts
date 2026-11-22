import type { Lang } from "@/lib/site/i18n";
import type { Show } from "./types";

/** Audio sub-folder name per app language. */
export const AUDIO_DIR: Record<Lang, string> = {
  en: "Audio", da: "Lydfiler", de: "Audiodateien", fr: "Fichiers audio", es: "Archivos de audio", sv: "Ljudfiler", no: "Lydfiler",
};
export const SHOW_FILE = "show.stagecue.json";

export interface AudioRef { fileId: string; fileName: string }

/** Every audio cue's file reference (incl. group children), one per fileId. */
export function audioRefs(show: Show): AudioRef[] {
  const out = new Map<string, string>();
  const walk = (cues: any[]) => {
    for (const c of cues) {
      if (c.type === "audio" && c.fileId) out.set(c.fileId, c.fileName || c.fileId);
      if (c.type === "group" && Array.isArray(c.children)) walk(c.children);
    }
  };
  for (const s of show.songs) walk(s.cues as any[]);
  return [...out].map(([fileId, fileName]) => ({ fileId, fileName }));
}

const clean = (n: string) => n.replace(/[\\/:*?"<>|]/g, "_").trim() || "lyd";

/** Unique file name on disk for each fileId (duplicates get " (2)" etc.). */
export function diskNames(refs: AudioRef[]): Record<string, string> {
  const used = new Set<string>(); const out: Record<string, string> = {};
  for (const r of refs) {
    const base = clean(r.fileName); const dot = base.lastIndexOf(".");
    const stem = dot > 0 ? base.slice(0, dot) : base; const ext = dot > 0 ? base.slice(dot) : "";
    let name = base; let i = 2;
    while (used.has(name.toLowerCase())) name = `${stem} (${i++})${ext}`;
    used.add(name.toLowerCase()); out[r.fileId] = name;
  }
  return out;
}

/** Match missing refs to found files by name (saved map first, then cue file name), case-insensitive, any folder. */
export function matchFiles<F extends { name: string }>(missing: AudioRef[], files: F[], saved?: Record<string, string>): Record<string, F> {
  const byName = new Map<string, F>();
  for (const f of files) if (!byName.has(f.name.toLowerCase())) byName.set(f.name.toLowerCase(), f);
  const out: Record<string, F> = {};
  for (const r of missing) {
    const hit = (saved?.[r.fileId] && byName.get(saved[r.fileId]!.toLowerCase())) || byName.get(r.fileName.toLowerCase());
    if (hit) out[r.fileId] = hit;
  }
  return out;
}
