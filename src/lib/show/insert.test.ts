import { describe, expect, it } from "vitest";
import { emptyShow, insertCue, newCue, shiftCue } from "./logic";

const setup = () => { const s = emptyShow(); const a = newCue("memo"), b = newCue("memo"); s.songs = [{ id: "s1", name: "A", cues: [a, b] }, { id: "s2", name: "B", cues: [] }]; return { s, a, b }; };

describe("adding cues", () => {
  it("goes right below the clicked cue", () => { const { s, a, b } = setup(); const c = newCue("midi"); expect(insertCue(s, c, a.id, null).songs[0]!.cues.map((x) => x.id)).toEqual([a.id, c.id, b.id]); });
  it("goes first in a clicked song", () => { const { s, a, b } = setup(); const c = newCue("midi"); expect(insertCue(s, c, null, "s1").songs[0]!.cues.map((x) => x.id)).toEqual([c.id, a.id, b.id]); expect(insertCue(s, c, null, "s2").songs[1]!.cues[0]!.id).toBe(c.id); });
  it("moves a cue up and down", () => { const { s, a, b } = setup(); expect(shiftCue(s, b.id, -1).songs[0]!.cues[0]!.id).toBe(b.id); expect(shiftCue(s, b.id, 1).songs[0]!.cues[1]!.id).toBe(b.id); });
});
