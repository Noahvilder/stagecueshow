import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import type { Show } from "./types";

/** Collect every audio fileId in the show, including group children. */
export function collectFileIds(show: Show): string[] {
  const ids = new Set<string>();
  const walk = (cues: any[]) => {
    for (const c of cues) {
      if (c.type === "audio" && c.fileId) ids.add(c.fileId);
      if (c.type === "group" && Array.isArray(c.children)) walk(c.children);
    }
  };
  for (const s of show.songs) walk(s.cues as any[]);
  walk((show.cart ?? []) as any[]);
  return [...ids];
}

export function packArchive(show: Show, audio: Record<string, Uint8Array>): Uint8Array {
  const files: Record<string, Uint8Array> = { "show.json": strToU8(JSON.stringify(show)) };
  for (const [id, bytes] of Object.entries(audio)) files[`audio/${id}`] = [bytes, { level: 0 }] as any;
  return zipSync(files);
}

export function unpackArchive(data: Uint8Array): { showJson: string; audio: Record<string, Uint8Array> } {
  const files = unzipSync(data);
  if (!files["show.json"]) throw new Error("Ugyldig backup: show.json mangler");
  const audio: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(files)) if (k.startsWith("audio/")) audio[k.slice(6)] = v;
  return { showJson: strFromU8(files["show.json"]), audio };
}
