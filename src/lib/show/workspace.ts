import type { Cue, Show } from "./types";
import { insertCue } from "./logic";

export type WorkspaceMode = "pro" | "theatre";
export const readWorkspaceMode = (value: string | null): WorkspaceMode => value === "theatre" ? "theatre" : "pro";

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