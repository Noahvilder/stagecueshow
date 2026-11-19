import { describe, expect, it } from "vitest";
import { resolveTier } from "./plan";
const now = Date.parse("2026-11-19T12:00:00Z");
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
describe("resolveTier", () => {
  it("active license is pro", () => expect(resolveTier({ status: "active", current_period_end: null }, daysAgo(100), now).tier).toBe("pro"));
  it("expired license after trial is free", () => expect(resolveTier({ status: "active", current_period_end: daysAgo(1) }, daysAgo(30), now).tier).toBe("free"));
  it("day 6 is trial with 1 day left", () => expect(resolveTier(null, daysAgo(6), now)).toEqual({ tier: "trial", trialDaysLeft: 1 }));
  it("day 8 is free", () => expect(resolveTier(null, daysAgo(8), now).tier).toBe("free"));
});
