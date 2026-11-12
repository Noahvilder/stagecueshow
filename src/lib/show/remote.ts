import type { CueType, MidiMsg, Show } from "./types";

/** Snapshot the main computer sends to phones. */
export interface RemoteState {
  showName: string;
  midiPorts?: string[];
  standbyId: string | null;
  running: string[];
  muted?: boolean;
  locked?: boolean;
  songs: { id: string; name: string; cues: { id: string; name: string; type: CueType; color: string; notes: string; text?: string; hasAudio?: boolean }[] }[];
}
export type RemoteCmd =
  | { t: "go" }
  | { t: "panic" }
  | { t: "stopAll" }
  | { t: "step"; d: 1 | -1 }
  | { t: "standby"; id: string }
  | { t: "fire"; id: string }
  | { t: "stopCue"; id: string }
  | { t: "getAudio"; id: string }
  | { t: "setShow"; show: Show }
  | { t: "testMidi"; msg: MidiMsg }
  | { t: "mute"; on: boolean };
export type HostMsg =
  | { t: "state"; s: RemoteState }
  | { t: "audio"; id: string; mime: string; buf: ArrayBuffer | null };

export const PEER_PREFIX = "stagecue-ctl-";
export const makeCode = () => String(Math.floor(100000 + Math.random() * 900000));
export const isValidCode = (c: string) => /^\d{6}$/.test(c);
