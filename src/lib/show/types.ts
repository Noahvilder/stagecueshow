/** What happens to the NEXT cue after this one fires. */
export type Follow = "manual" | "withStart" | "afterEnd";
export type MidiKind = "noteon" | "noteoff" | "cc" | "pc" | "polyat" | "chanat" | "pitchbend" | "start" | "stop" | "continue" | "clock";

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
  follow: Follow;
  preWait: number;
  postWait: number;
  color?: string;
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
  outputId: string;
  /** Trim start in seconds (0 = file start). */
  startTime?: number;
  /** Trim end in seconds (0 = file end). */
  endTime?: number;
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
  typeColors: Partial<Record<CueType, string>>;
  songs: Song[];
}
