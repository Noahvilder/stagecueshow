import { describe, expect, it } from "vitest";
import { defaultMonitors, monitorBody, removeMonitor } from "./monitors";
import { emptyShow, newCue, parseShow } from "./logic";

describe("personal monitors", () => {
  it("creates the default stage roles", () => { expect(defaultMonitors().map((m) => m.name)).toEqual(["Forsanger", "Guitar", "Bas", "Keys", "Trommer", "Lys / Teknik"]); });
  it("shows only the selected musician's notes", () => { expect(monitorBody({ notes: "Fælles", monitorNotes: { bass: "Drop-D", singer: "Syng" } }, "bass")).toBe("Drop-D"); });
  it("falls back to common memo and notes for empty personal notes", () => { expect(monitorBody({ text: "Stop", notes: "Alle", monitorNotes: { bass: "  " } }, "bass")).toBe("Stop\n\nAlle"); });
  it("retains profiles and tagged notes through JSON export/import", () => { const show = emptyShow(); show.songs[0]?.cues.push({ ...newCue("memo"), monitorNotes: { bass: "[Eb]Bas" } }); expect(parseShow(JSON.stringify(show))).toEqual(show); });
  it("removes tags inside groups without changing other profiles", () => { const show = emptyShow(); show.songs[0]?.cues.push({ ...newCue("group"), type: "group", children: [{ ...newCue("memo"), monitorNotes: { bass: "A", singer: "B" } }] }); const removed = removeMonitor(show, "bass"); const group = removed.songs[0]?.cues[0]; expect(group?.type === "group" && group.children[0]?.monitorNotes).toEqual({ singer: "B" }); expect(removed.monitors?.some((m) => m.id === "bass")).toBe(false); });
});