import { describe, it, expect } from "vitest";
import { AUDIO_DIR, audioRefs, diskNames, matchFiles } from "./projectFolder";

describe("project folder", () => {
  it("names the audio folder by language", () => {
    expect(AUDIO_DIR.en).toBe("Audio");
    expect(AUDIO_DIR.da).toBe("Lydfiler");
  });
  it("gives duplicate file names unique disk names", () => {
    expect(diskNames([{ fileId: "a", fileName: "klik.wav" }, { fileId: "b", fileName: "Klik.wav" }])).toEqual({ a: "klik.wav", b: "Klik (2).wav" });
  });
  it("finds missing files by name regardless of folder or case", () => {
    const show: any = { songs: [{ cues: [{ type: "audio", fileId: "a", fileName: "Intro.wav" }, { type: "group", children: [{ type: "audio", fileId: "b", fileName: "x.wav" }] }] }] };
    const refs = audioRefs(show);
    const files = [{ name: "intro.WAV", path: "Lydfiler/intro.WAV" }, { name: "x (2).wav", path: "Audio/x (2).wav" }];
    const m = matchFiles(refs, files, { b: "x (2).wav" });
    expect(m["a"]?.path).toBe("Lydfiler/intro.WAV");
    expect(m["b"]?.path).toBe("Audio/x (2).wav");
  });
});
