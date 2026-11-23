import { describe, it, expect } from "vitest";
import { framesToTc, tcToFrames, formatTc, parseTc, mtcQuarter, MtcReader, LtcWriter, LtcReader, ltcBits, type Tc } from "./timecode";

describe("timecode", () => {
  it("converts 25 fps frames both ways", () => {
    expect(framesToTc(25 * 3661 + 7, 25)).toEqual({ h: 1, m: 1, s: 1, f: 7 });
    expect(tcToFrames({ h: 1, m: 1, s: 1, f: 7 }, 25)).toBe(25 * 3661 + 7);
  });
  it("skips frames 0 and 1 at minute starts in 29.97 drop-frame, except every 10th", () => {
    expect(framesToTc(1800, 29.97)).toEqual({ h: 0, m: 1, s: 0, f: 2 });
    expect(framesToTc(17982, 29.97)).toEqual({ h: 0, m: 10, s: 0, f: 0 });
    for (const n of [0, 1799, 1800, 17981, 17982, 107892]) expect(tcToFrames(framesToTc(n, 29.97), 29.97)).toBe(n);
  });
  it("formats and parses", () => {
    expect(formatTc({ h: 1, m: 2, s: 3, f: 4 }, 29.97)).toBe("01:02:03;04");
    expect(parseTc("01:02:03:04")).toEqual({ h: 1, m: 2, s: 3, f: 4 });
    expect(parseTc("1:99:00:00")).toBeNull();
  });
  it("round-trips MTC quarter frames", () => {
    const t: Tc = { h: 10, m: 20, s: 30, f: 12 };
    const r = new MtcReader();
    let got: number | null = null;
    for (let p = 0; p < 8; p++) got = r.push(mtcQuarter(t, p, 30)) ?? got;
    expect(r.fps).toBe(30);
    expect(got).toBe(tcToFrames(t, 30) + 2);
  });
  it("LTC frames have an even number of zeros and end in the sync word", () => {
    const b = ltcBits({ h: 1, m: 2, s: 3, f: 4 }, 25);
    expect(b.filter((x) => x === 0).length % 2).toBe(0);
    expect(b.slice(64).join("")).toBe("0011111111111101");
  });
  it("decodes LTC audio produced by the generator", () => {
    const w = new LtcWriter(25, 48000);
    const r = new LtcReader(48000);
    const got: string[] = [];
    const start = tcToFrames({ h: 0, m: 59, s: 59, f: 20 }, 25);
    r.push(w.render(start, 10), (tc) => got.push(formatTc(tc)));
    expect(got).toContain("01:00:00:00");
    expect(got).toContain("00:59:59:24");
  });
});
