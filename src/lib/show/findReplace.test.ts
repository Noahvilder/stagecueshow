import { describe, expect, it } from "vitest";
import { findReplace } from "./findReplace";
import type { Show } from "./types";

const msg = (port: string, channel: number) => ({ id: port + channel, port, kind: "noteon" as const, channel, data1: 60, data2: 100 });
const base = { follow: "manual" as const, preWait: 0, postWait: 0 };
const show = {
  songs: [
    { id: "s1", name: "Intro", cues: [
      { ...base, id: "m1", name: "Lys op", type: "midi", messages: [msg("#1", 1), msg("#2", 1)] },
      { ...base, id: "a1", name: "Lyd", type: "audio", outputId: "#1" },
      { ...base, id: "g1", name: "Gruppe", type: "group", children: [{ ...base, id: "m2", name: "Lys ned", type: "midi", messages: [msg("#1", 3)] }] },
    ] },
  ],
} as unknown as Show;

describe("findReplace", () => {
  it("moves every message on MIDI #1 to MIDI #2, including inside groups", () => {
    const r = findReplace(show, { mode: "midiPort", from: "#1", to: "#2" });
    expect(r.hits.map((h) => h.cueId)).toEqual(["m1", "m2"]);
    const json = JSON.stringify(r.show);
    expect(json).not.toContain('"port":"#1"');
  });
  it("only touches audio cues for audio outputs", () => {
    const r = findReplace(show, { mode: "audioOut", from: "#1", to: "#3" });
    expect(r.hits.map((h) => h.cueId)).toEqual(["a1"]);
  });
  it("changes MIDI channel", () => {
    const r = findReplace(show, { mode: "midiCh", from: "1", to: "16" });
    expect(r.hits).toEqual([{ cueId: "m1", cueName: "Lys op", song: "Intro", count: 2 }]);
  });
  it("replaces text in cue names case-insensitively", () => {
    const r = findReplace(show, { mode: "text", from: "lys", to: "Light" });
    expect(r.hits.length).toBe(2);
    expect(JSON.stringify(r.show)).toContain("Light op");
  });
});
