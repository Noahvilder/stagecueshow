import { describe, expect, it } from "vitest";
import { diagShort, explain } from "./diagnose";

describe("diagnose", () => {
  it("explains an unassigned MIDI slot in English and points to settings", () => {
    const d = { code: "midiOutUnassigned" as const, slot: "MIDI 1" };
    expect(diagShort(d, "en")).toBe("MIDI output not assigned: MIDI 1");
    const x = explain(d, "en");
    expect(x.action).toBe("settings");
    expect(x.what).toContain("MIDI 1");
  });
  it("names the missing hardware in Danish", () => {
    expect(diagShort({ code: "midiOutGone", slot: "MIDI 2", hw: "USB MIDI" }, "da")).toBe("MIDI-udgang mangler: MIDI 2 – USB MIDI");
  });
});
