import { describe, it, expect } from "vitest";
import { gridCols, DEFAULT_VIEW } from "./view";
describe("cue list columns", () => {
  it("all on", () => expect(gridCols(DEFAULT_VIEW)).toBe("16px_28px_44px_1fr_auto_auto"));
  it("hidden columns are removed", () => expect(gridCols({ ...DEFAULT_VIEW, handle: false, number: false, type: false, follow: false })).toBe("28px_1fr"));
});
