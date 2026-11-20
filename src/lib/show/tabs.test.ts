import { describe, expect, it } from "vitest";
import { isTabLine, transposeChord, transposeSource, transposeTabLine, TAB_TUNINGS, tabTemplate } from "./tabs";

describe("tabs", () => {
  it("detects tab lines for 4 to 8 strings", () => {
    expect(isTabLine("G |--3--5--|")).toBe(true);
    expect(tabTemplate(TAB_TUNINGS["Guitar 8"]!).split("\n")).toHaveLength(8);
    expect(tabTemplate(TAB_TUNINGS["Bas 4"]!).split("\n")).toHaveLength(4);
    expect(isTabLine("Lights go out")).toBe(false);
  });
  it("transposes frets and keeps width", () => {
    expect(transposeTabLine("E|--8--10--|", 2)).toBe("E|--10-12--|");
    expect(transposeTabLine("E|--10--|", -2)).toBe("E|--8---|");
    expect(transposeTabLine("E|--0--|", -1)).toBe("E|--11-|");
  });
  it("transposes chords", () => {
    expect(transposeChord("Am", 2)).toBe("Bm");
    expect(transposeChord("Bb/F", 1)).toBe("B/F#");
    expect(transposeSource("[C]hej\nA|--2--|", 2)).toBe("[D]hej\nA|--4--|");
  });
});
