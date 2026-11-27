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
  /** Short trigger phrase: when to press GO for this cue. */
  stikord?: string;
  /** User cue number, decimals allowed ("1.5"). Empty = list position. */
  number?: string;
  /** Script/manuscript reference. */
  ref?: string;
  monitorNotes?: Record<string, string>;
  /** Fire this cue when incoming timecode reaches HH:MM:SS:FF. */
  tc?: string;
  /** Tempo map of a generated click track (shown live on the drummer monitor). */
  click?: ClickInfo;
}
export interface ClickInfo { meter: string; bars: number; startBpm: number; endBpm: number; holdBars?: number }

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
  /** First output channel (1-based) of a stereo pair on multichannel interfaces. Empty = 1/2. */
  channel?: number;
  /** Send mono to one channel only. */
  mono?: boolean;
  /** Trim start in seconds (0 = file start). */
  startTime?: number;
  /** Trim end in seconds (0 = file end). */
  endTime?: number;
  /** Mini-mixer: input trim in dB before the fader. */
  trim?: number;
  /** Low-cut (high-pass) on at 80 Hz. */
  hpf?: boolean;
  /** 3-band EQ gains in dB, mid frequency in Hz. */
  eqLow?: number;
  eqMid?: number;
  eqMidFreq?: number;
  eqHigh?: number;
};
export type MidiCue = Base & { type: "midi"; messages: MidiMsg[] };
export type OscCue = Base & { type: "osc"; host: string; port: number; address: string; args: string };
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
/** Light cue: target levels (0-255) per DMX channel, faded over `fade` seconds. */
export type DmxCue = Base & { type: "dmx"; fade: number; values: { ch: number; v: number; label?: string }[]; full?: boolean };
export interface DmxSettings { protocol: "artnet" | "sacn"; host: string; universe: number; hz: number }

/** Fires all children at the same time (each honours its own pre-wait). */
export type GroupCue = Base & { type: "group"; children: Cue[] };

export type Cue = AudioCue | MidiCue | OscCue | FadeCue | StopCue | PauseCue | WaitCue | MemoCue | DmxCue | GroupCue;
export type CueType = Cue["type"];

/** Soundboard pad: an audio cue fired outside the cue list, with its own output. */
export type CartPad = AudioCue & { color?: string; key?: string };

export interface Song {
  id: string;
  name: string;
  cues: Cue[];
  /** Quarter-note tempo and meter for the concert workspace's visual pulse. */
  bpm?: number;
  meter?: string;
}

export interface Show {
  version: 1;
  name: string;
  panicFade: number;
  typeColors: Partial<Record<CueType, string>>;
  songs: Song[];
  /** Soundboard (cart) pads for jingles and effects. */
  cart?: CartPad[];
  monitors?: MonitorProfile[];
  /** DMX (Art-Net/sACN) output and channel names. */
  dmx?: DmxSettings & { names?: Record<number, string> };
  /** Friendly names for hardware ports, travels with the show. */
  ioAliases?: { audio?: Record<string, string>; midi?: Record<string, string> };
  /** Per cue type: starting values for newly created cues. */
  cueDefaults?: Partial<Record<CueType, Record<string, unknown>>>;
  /** Numbered outputs ("Lyd 1", "MIDI 2"): cues point at the number, each PC picks the hardware. */
  /** Window layout of the pult, so it follows the show to another PC. */
  /** Default PA output for cues with no output chosen (slot "#1" or hardware id). */
  paOut?: string;
  paCh?: number;
  /** Pre-listen (PFL) output and first channel. */
  pflOut?: string;
  pflCh?: number;
  layout?: { wins?: Record<string, unknown>; snap?: string; goGuard?: number; timeMode?: string; timeFmt?: string; noteSize?: number; pedals?: unknown };
  /** fileId → file name inside the project folder's audio sub-folder. */
  audioFiles?: Record<string, string>;
  patch?: { audio?: { alias: string; hw: string; hwLabel?: string }[]; midi?: { alias: string; hw: string; hwLabel?: string }[] };
}

export interface MonitorProfile {
  id: string;
  name: string;
  mode: "lyrics" | "hud";
}

export function ioName(hw: string, alias?: string): string {
  const a = alias?.trim();
  return a ? `${a} (${hw})` : hw;
}
