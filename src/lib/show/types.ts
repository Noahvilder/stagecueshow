export type Trigger = "manual" | "withPrev" | "afterPrev";
export type MidiKind = "noteon" | "noteoff" | "cc" | "pc";

export interface MidiMsg {
  id: string;
  port: string;
  kind: MidiKind;
  channel: number;
  data1: number;
  data2: number;
}

interface Base {
  id: string;
  name: string;
  trigger: Trigger;
  preWait: number;
  notes?: string;
}

export type AudioCue = Base & {
  type: "audio";
  fileId: string | null;
  fileName: string;
  volume: number;
  pan: number;
  fadeIn: number;
  fadeOut: number;
  loop: boolean;
};
export type MidiCue = Base & { type: "midi"; messages: MidiMsg[] };
export type FadeCue = Base & {
  type: "fade";
  target: string;
  volume: number;
  duration: number;
  stopAfter: boolean;
};
export type StopCue = Base & { type: "stop"; target: string; duration: number };
export type PauseCue = Base & { type: "pause"; target: string };
export type WaitCue = Base & { type: "wait"; duration: number };
export type MemoCue = Base & { type: "memo"; text: string };

export type Cue = AudioCue | MidiCue | FadeCue | StopCue | PauseCue | WaitCue | MemoCue;
export type CueType = Cue["type"];

export interface Song {
  id: string;
  name: string;
  cues: Cue[];
}

export interface Show {
  version: 1;
  name: string;
  panicFade: number;
  songs: Song[];
}
