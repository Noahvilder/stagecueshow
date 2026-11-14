import type { CueType, MidiMsg, Show, MonitorProfile } from "./types";

/** Snapshot the main computer sends to phones. */
export interface RemoteState {
  showName: string;
  monitors?: MonitorProfile[];
  midiPorts?: string[];
  standbyId: string | null;
  running: string[];
  muted?: boolean;
  locked?: boolean;
   songs: { id: string; name: string; cues: { id: string; name: string; type: CueType; color: string; notes: string; monitorNotes?: Record<string, string>; text?: string; hasAudio?: boolean }[] }[];
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
  | { t: "mute"; on: boolean }
  | { t: "setMonitorNote"; cueId: string; monitor: string; text: string }
  | { t: "viewerRole"; monitor: string };
export type HostMsg =
  | { t: "state"; s: RemoteState }
  | { t: "audio"; id: string; mime: string; buf: ArrayBuffer | null };

export const PEER_PREFIX = "stagecue-ctl-";
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** 12-char code from a cryptographic RNG (~59 bits) – infeasible to guess. */
export const makeCode = () => {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(b, (x) => ALPHA[x % ALPHA.length]).join("");
};
export const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
export const isValidCode = (c: string) => /^[A-HJKMNP-Z2-9]{12}$/.test(c);
