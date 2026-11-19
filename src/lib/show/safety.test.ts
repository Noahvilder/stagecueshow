import { describe, expect, it } from "vitest";
import { acceptGo, isDoubleTap, shouldOfferResume } from "./safety";

describe("live safety", () => {
  it("ignores a second GO within the 0.5 s guard", () => {
    expect(acceptGo(1000, 1300, 500)).toBe(false);
    expect(acceptGo(1000, 1500, 500)).toBe(true);
    expect(acceptGo(null, 0, 500)).toBe(true);
  });
  it("guard 0 disables the protection", () => expect(acceptGo(1000, 1001, 0)).toBe(true));
  it("Esc twice within 600 ms is a double tap (hard stop)", () => {
    expect(isDoubleTap(1000, 1600)).toBe(true);
    expect(isDoubleTap(1000, 1601)).toBe(false);
  });
  it("offers resume only after an unclean, recent session", () => {
    const now = 10 * 3600 * 1000;
    expect(shouldOfferResume({ standbyId: "a", label: "x", t: now - 1000, clean: false }, now)).toBe(true);
    expect(shouldOfferResume({ standbyId: "a", label: "x", t: now - 1000, clean: true }, now)).toBe(false);
    expect(shouldOfferResume({ standbyId: "a", label: "x", t: now - 13 * 3600 * 1000, clean: false }, now + 3600 * 1000 * 4)).toBe(false);
  });
});
