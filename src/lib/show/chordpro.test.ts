import { describe, it, expect } from "vitest";
import { parseChordPro } from "./chordpro";
describe("parseChordPro", () => {
  it("places chords above the following lyric", () => {
    const [l] = parseChordPro("[Eb]Lights go out and I [Bbm]can't be saved");
    expect(l!.segs).toEqual([{ chord: "Eb", text: "Lights go out and I " }, { chord: "Bbm", text: "can't be saved" }]);
  });
  it("keeps leading lyric without chord", () => {
    expect(parseChordPro("Tides that I tried to [Fm]swim")[0]!.segs[0]).toEqual({ chord: "", text: "Tides that I tried to " });
  });
  it("detects chord-only lines", () => {
    expect(parseChordPro("[Eb] [Bbm] [Fm]")[0]!.chordsOnly).toBe(true);
  });
});
