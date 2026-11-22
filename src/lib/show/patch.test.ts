import { describe, expect, it } from "vitest";
import { numberExisting, resolveOut } from "./patch";
import type { Show } from "./types";

const base = (): Show => ({
  version: 1, name: "t", panicFade: 1, typeColors: {},
  songs: [{ id: "s", name: "S", cues: [
    { id: "a", type: "audio", name: "A", follow: "manual", preWait: 0, postWait: 0, fileId: null, fileName: "", volume: 0, pan: 0, fadeIn: 0, fadeOut: 0, loop: false, outputId: "dev-x" },
    { id: "m", type: "midi", name: "M", follow: "manual", preWait: 0, postWait: 0, messages: [{ id: "1", port: "loopMIDI 1", kind: "noteon", channel: 1, data1: 60, data2: 127 }] },
    { id: "m2", type: "midi", name: "M2", follow: "manual", preWait: 0, postWait: 0, messages: [{ id: "2", port: "loopMIDI 1", kind: "cc", channel: 1, data1: 1, data2: 1 }] },
  ] }],
});

describe("output numbers", () => {
  it("cues on the same port share one number", () => {
    const s = numberExisting(base(), { "dev-x": "Focusrite 1-2" });
    expect(s.patch?.midi).toHaveLength(1);
    const cues = s.songs[0]!.cues;
    expect(cues[1]?.type === "midi" && cues[1]?.messages[0]?.port).toBe("#1");
    expect(cues[2]?.type === "midi" && cues[2]?.messages[0]?.port).toBe("#1");
    expect(cues[0]?.type === "audio" && cues[0]?.outputId).toBe("#1");
  });
  it("changing the hardware of a number changes every cue using it", () => {
    const s = numberExisting(base());
    s.patch!.midi![0]!.hw = "USB MIDI";
    expect(resolveOut(s, "midi", "#1")).toBe("USB MIDI");
  });
  it("finds an audio device by name on a new PC", () => {
    const s = numberExisting(base(), { "dev-x": "Focusrite 1-2" });
    expect(resolveOut(s, "audio", "#1", [{ id: "new-id", label: "Focusrite 1-2" }])).toBe("new-id");
  });
});
