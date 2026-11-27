import type { Cue, Show } from "./types";
import { flatten, insertCue } from "./logic";
import { beatTimes, clickLength, METERS, type ClickSettings, type Meter } from "./clicktrack";
import type { ClickInfo } from "./types";

export type WorkspaceMode = "pro" | "theatre" | "band";
export const readWorkspaceMode = (value: string | null): WorkspaceMode => value === "theatre" || value === "band" ? value : "pro";

/** Runtime-only boundaries: saved follows, outputs and group children stay intact. */
export function workspacePlayback(show: Show, mode: WorkspaceMode, autoStop: boolean): Cue[] {
  if (mode !== "band" || !autoStop) return flatten(show);
  return show.songs.flatMap((song) => song.cues.map((cue, i) => i === song.cues.length - 1 ? { ...cue, follow: "manual" as const } : cue));
}

export function concertMeter(value?: string): Meter {
  return METERS.find((meter) => meter === value) ?? "4/4";
}

export function concertTempo(value?: number): number {
  return Number.isFinite(value) && value !== undefined ? Math.min(300, Math.max(20, value)) : 120;
}

export function concertClickMap(click: ClickInfo) {
  const settings: ClickSettings = { ...click, meter: concertMeter(click.meter), sound: "wood", accent: true, accentGain: 0, volume: 0 };
  return { beats: beatTimes(settings), end: clickLength(settings), settings };
}

export function concertBeat(elapsed: number, bpm: number, meter: string) {
  const [per = "4", unit = "4"] = concertMeter(meter).split("/");
  const seconds = 60 / concertTempo(bpm) * (4 / Number(unit));
  const index = Math.floor(Math.max(0, elapsed) / seconds);
  return { beat: index % Number(per) + 1, bar: Math.floor(index / Number(per)) + 1, flash: elapsed >= 0 && elapsed % seconds < Math.min(0.12, seconds / 3) };
}

/** Drafts enter the shared show only when the guide is completed. */
export function saveGuidedCue(show: Show, cue: Cue, editing: boolean, selectedId: string | null, sceneId: string): Show {
  if (editing) return { ...show, songs: show.songs.map((song) => ({ ...song, cues: song.cues.map((c) => c.id === cue.id ? cue : c) })) };
  if (!show.songs.some((song) => song.id === sceneId)) return show;
  const anchor = show.songs.find((song) => song.id === sceneId)?.cues.some((c) => c.id === selectedId) ? selectedId : null;
  return insertCue(show, cue, anchor, sceneId);
}

export function guidedCueError(cue: Cue, pendingAudio = false): string | null {
  if (!cue.name.trim()) return "Giv cuet et navn.";
  if (cue.type === "audio" && !cue.fileId && !pendingAudio) return "Vælg en lydfil.";
  if (cue.type === "midi" && (!cue.messages.length || cue.messages.some((m) => !m.port))) return "Vælg en MIDI-udgang til hver besked.";
  if (cue.type === "osc" && (!cue.host.trim() || !cue.address.startsWith("/") || cue.port < 1 || cue.port > 65535)) return "Angiv IP, port og en OSC-adresse, der starter med /.";
  if (cue.type === "dmx" && !cue.values.length && !cue.full) return "Tilføj mindst én lyskanal, eller vælg hel scene.";
  if (cue.type === "group" && !cue.children.length) return "Tilføj mindst ét cue til gruppen.";
  return null;
}