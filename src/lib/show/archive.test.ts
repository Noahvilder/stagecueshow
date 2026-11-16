import { describe, it, expect } from "vitest";
import { packArchive, unpackArchive, collectFileIds } from "./archive";

describe("show backup", () => {
  it("roundtrips show and audio bytes", () => {
    const show: any = { name: "X", songs: [{ id: "s", cues: [{ type: "audio", fileId: "a1" }, { type: "group", children: [{ type: "audio", fileId: "a2" }] }] }] };
    expect(collectFileIds(show)).toEqual(["a1", "a2"]);
    const z = packArchive(show, { a1: new Uint8Array([1, 2, 3]) });
    const out = unpackArchive(z);
    expect(JSON.parse(out.showJson).name).toBe("X");
    expect([...out.audio.a1]).toEqual([1, 2, 3]);
  });
});
