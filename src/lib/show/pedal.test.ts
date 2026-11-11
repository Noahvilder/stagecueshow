import { describe, expect, it } from "vitest";
import { matchPedal, parseMidiIn } from "./pedal";

describe("pedal input", () => {
  it("CC press on channel 1 triggers GO", () => {
    const ev = parseMidiIn([0xb0, 64, 127])!;
    expect(matchPedal({ go: { kind: "cc", channel: 1, data1: 64 } }, ev)).toBe("go");
  });
  it("CC release (value 0) does not trigger", () => {
    expect(parseMidiIn([0xb0, 64, 0])).toBeNull();
  });
  it("note on with velocity 0 is a release", () => {
    expect(parseMidiIn([0x90, 60, 0])).toBeNull();
  });
  it("same CC on another channel does not match", () => {
    const ev = parseMidiIn([0xb1, 64, 127])!;
    expect(matchPedal({ go: { kind: "cc", channel: 1, data1: 64 } }, ev)).toBeNull();
  });
});
