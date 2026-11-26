import { describe, expect, it } from "vitest";
import { emptyShow, newCue, parseShow } from "./logic";
import { guidedCueError, readWorkspaceMode, saveGuidedCue } from "./workspace";

describe("shared show in Pro and Teater & Skole", () => {
  it("defaults older installations to Pro", () => {
    expect(readWorkspaceMode(null)).toBe("pro");
    expect(readWorkspaceMode("theatre")).toBe("theatre");
  });
  it("creates a cue in its chosen Akt/Scene without changing other scenes", () => {
    const show = { ...emptyShow(), songs: [{ id: "act1", name: "Akt 1", cues: [] }, { id: "scene2", name: "Scene 2", cues: [] }] };
    const cue = newCue("memo");
    const saved = saveGuidedCue(show, cue, false, null, "scene2");
    expect(saved.songs[0]?.cues).toEqual([]);
    expect(saved.songs[1]?.cues).toEqual([cue]);
    expect(show.songs[1]?.cues).toEqual([]);
  });
  it("keeps individual audio outputs and timing in the same exportable show format", () => {
    const show = { ...emptyShow(), songs: [{ id: "scene", name: "Akt/Scene 1", cues: [] }] };
    const first = { ...newCue("audio"), outputId: "#2", channel: 3, preWait: 1.5 };
    const second = { ...newCue("audio"), outputId: "#4", channel: 7 };
    const saved = saveGuidedCue(saveGuidedCue(show, first, false, null, "scene"), second, false, first.id, "scene");
    const reopened = parseShow(JSON.stringify(saved));
    expect(reopened.songs[0]?.cues).toEqual([first, second]);
  });
  it("edits a cue in place without moving or duplicating it", () => {
    const cue = newCue("wait");
    const show = { ...emptyShow(), songs: [{ id: "scene", name: "Scene", cues: [cue] }] };
    const updated = { ...cue, name: "Vent før entré", preWait: 2 };
    expect(saveGuidedCue(show, updated, true, null, "scene").songs[0]?.cues).toEqual([updated]);
    expect(show.songs[0]?.cues[0]?.name).toBe("Vent");
  });
  it("does not save a cue into a removed scene", () => {
    const show = emptyShow();
    expect(saveGuidedCue(show, newCue("memo"), false, null, "deleted")).toBe(show);
  });
  it("requires an audio file but accepts a pending file until final save", () => {
    const cue = newCue("audio");
    expect(guidedCueError(cue)).toBe("Vælg en lydfil.");
    expect(guidedCueError(cue, true)).toBeNull();
  });
  it("ignores a selected cue in a different scene when inserting", () => {
    const old = newCue("memo");
    const cue = newCue("wait");
    const show = { ...emptyShow(), songs: [{ id: "one", name: "1", cues: [old] }, { id: "two", name: "2", cues: [] }] };
    const saved = saveGuidedCue(show, cue, false, old.id, "two");
    expect(saved.songs[0]?.cues).toEqual([old]);
    expect(saved.songs[1]?.cues).toEqual([cue]);
  });
});