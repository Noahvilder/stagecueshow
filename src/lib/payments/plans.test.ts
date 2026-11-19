import { describe, it, expect } from "vitest";
import { PRICE_TO_PLAN, licenseStatus } from "./plans";
import { resolveTier } from "@/lib/show/plan";

describe("payment → Pro", () => {
  it("maps the three prices to plans", () => {
    expect(PRICE_TO_PLAN["pro_monthly"]).toBe("monthly");
    expect(PRICE_TO_PLAN["pro_yearly"]).toBe("yearly");
    expect(PRICE_TO_PLAN["pro_lifetime"]).toBe("lifetime");
  });
  it("active subscription gives Pro", () => {
    const end = new Date(Date.now() + 86400000).toISOString();
    expect(resolveTier({ status: licenseStatus("active"), current_period_end: end }, null).tier).toBe("pro");
  });
  it("lifetime (no end date) gives Pro forever", () => {
    expect(resolveTier({ status: "active", current_period_end: null }, null).tier).toBe("pro");
  });
  it("cancelled subscription keeps Pro until period end, then drops", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(resolveTier({ status: licenseStatus("canceled"), current_period_end: past }, null).tier).toBe("free");
    expect(licenseStatus("unpaid")).toBe("inactive");
  });
});
