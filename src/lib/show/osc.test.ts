import { describe, it, expect } from "vitest";
import { encodeOsc, parseOscArgs, isVirtualMidi } from "./osc";

describe("osc", () => {
  it("parses ints, floats and quoted strings", () => {
    expect(parseOscArgs('1 0.5 "Go+ Exec 1" x')).toEqual([1, 0.5, "Go+ Exec 1", "x"]);
  });
  it("encodes address, tags and an int padded to 4 bytes", () => {
    const b = encodeOsc("/play", [1]);
    expect(Array.from(b)).toEqual([47,112,108,97,121,0,0,0, 44,105,0,0, 0,0,0,1]);
  });
  it("recognises LoopMIDI as virtual", () => {
    expect(isVirtualMidi("loopMIDI Port")).toBe(true);
    expect(isVirtualMidi("Focusrite USB MIDI")).toBe(false);
  });
});
