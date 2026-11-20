import { describe, it, expect } from "vitest";
import { barsForSeconds, beatTimes, type ClickSettings } from "./clicktrack";
const base: ClickSettings = { meter: "4/4", bars: 2, startBpm: 120, endBpm: 120, sound: "wood", accent: true, accentGain: 0.5, volume: 1 };
describe("clicktrack", () => {
  it("4/4 × 2 bars gives 8 clicks, accent on beat 1 only", () => {
    const b = beatTimes(base);
    expect(b).toHaveLength(8);
    expect(b.filter((x) => x.accent).map((x) => x.bar)).toEqual([1, 2]);
  });
  it("120 BPM fixed = 0.5s spacing", () => {
    expect(beatTimes(base)[1]!.time).toBeCloseTo(0.5);
  });
  it("6/8 clicks are eighths: 120 BPM = 0.25s", () => {
    const b = beatTimes({ ...base, meter: "6/8", bars: 1 });
    expect(b).toHaveLength(6);
    expect(b[1]!.time).toBeCloseTo(0.25);
  });
  it("ramp up gets steadily faster", () => {
    const b = beatTimes({ ...base, startBpm: 100, endBpm: 140, bars: 4 });
    const gaps = b.slice(1).map((x, i) => x.time - b[i]!.time);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]!).toBeLessThan(gaps[i - 1]!);
  });
  it("hold keeps end tempo for extra bars after the ramp", () => {
    const b = beatTimes({ ...base, startBpm: 100, endBpm: 140, bars: 2, holdBars: 2 });
    expect(b).toHaveLength(16);
    const gaps = b.slice(8).map((x, i) => x.time - b[7 + i]!.time);
    for (const g of gaps) expect(g).toBeCloseTo(60 / 140);
  });
  it("10 seconds at 120 BPM 4/4 rounds up to 5 bars", () => {
    expect(barsForSeconds(10, 120, "4/4")).toBe(5);
    expect(barsForSeconds(9, 120, "4/4")).toBe(5);
  });
});
