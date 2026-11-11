import { describe, expect, it } from "vitest";
import { midiBytes, nextStandbyIndex, newCue } from "./logic";
import type { Cue, Follow } from "./types";

const cue = (follow: Follow): Cue => ({ ...newCue("wait"), follow });

describe("standby after GO", () => {
  it("skips cues in the auto-follow chain", () => {
    const flat = [cue("afterEnd"), cue("withStart"), cue("manual"), cue("manual")];
    expect(nextStandbyIndex(flat, 0)).toBe(3);
  });
  it("manual cue moves to the very next cue", () => {
    expect(nextStandbyIndex([cue("manual"), cue("manual")], 0)).toBe(1);
  });
});

describe("midi bytes", () => {
  it("CC on channel 2", () => {
    expect(midiBytes({ id: "", port: "", kind: "cc", channel: 2, data1: 7, data2: 100 })).toEqual([0xb1, 7, 100]);
  });
  it("program change is two bytes", () => {
    expect(midiBytes({ id: "", port: "", kind: "pc", channel: 1, data1: 5, data2: 0 })).toEqual([0xc0, 5]);
  });
});

import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("midiBytes extra kinds", () => {
  i2("pitch bend center = 8192 splits into LSB/MSB", () => {
    e2(midiBytes({ id: "", port: "", kind: "pitchbend", channel: 1, data1: 8192, data2: 0 })).toEqual([0xe0, 0x00, 0x40]);
  });
  i2("channel aftertouch is 2 bytes", () => {
    e2(midiBytes({ id: "", port: "", kind: "chanat", channel: 3, data1: 90, data2: 0 })).toEqual([0xd2, 90]);
  });
  i2("transport start is a single byte", () => {
    e2(midiBytes({ id: "", port: "", kind: "start", channel: 1, data1: 0, data2: 0 })).toEqual([0xfa]);
  });
});

import { trimSpan } from "./logic";
describe("trimSpan", () => {
  it("uses whole file when untrimmed", () => expect(trimSpan(10)).toEqual({ start: 0, end: 10, len: 10 }));
  it("applies start and end trim", () => expect(trimSpan(10, 1.5, 8)).toEqual({ start: 1.5, end: 8, len: 6.5 }));
  it("end 0 means file end", () => expect(trimSpan(10, 2, 0).end).toBe(10));
  it("invalid end before start falls back to file end", () => expect(trimSpan(10, 5, 3).end).toBe(10));
});
