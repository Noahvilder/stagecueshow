import { describe, expect, it } from "vitest";
import { preflight } from "./preflight";
import type { Show } from "./types";

const show = (cues: any[]): Show => ({ id: "s", name: "x", songs: [{ id: "g", name: "A", cues }] } as any);

describe("preflight", () => {
  it("flags an empty show", () => expect(preflight(show([]), [])[0]?.code).toBe("empty"));
  it("flags audio cue without file and missing file", () => {
    const r = preflight(show([{ id: "a", name: "A", type: "audio", fileId: null }, { id: "b", name: "B", type: "audio", fileId: "f1" }]), ["f1"]);
    expect(r.map((x) => x.code)).toEqual(["noFile", "fileMissing"]);
  });
  it("flags stop cue pointing at a deleted cue, accepts 'all'", () => {
    const r = preflight(show([{ id: "s1", name: "S", type: "stop", target: "gone", duration: 0 }, { id: "s2", name: "S2", type: "stop", target: "all", duration: 0 }]), []);
    expect(r.map((x) => x.cueId)).toEqual(["s1"]);
  });
  it("checks cues inside groups", () => {
    const r = preflight(show([{ id: "g1", name: "G", type: "group", children: [{ id: "m", name: "M", type: "midi", messages: [] }] }]), []);
    expect(r[0]?.code).toBe("midiEmpty");
  });
  it("is clean for a good show", () => expect(preflight(show([{ id: "a", name: "A", type: "audio", fileId: "f" }]), [])).toEqual([]));
});
