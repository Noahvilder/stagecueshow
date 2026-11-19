import { describe, expect, it } from "vitest";
import { assign, comboOf, findAction, DEFAULT_SHORTCUTS } from "./shortcuts";
describe("shortcuts", () => {
  it("single key creates cue", () => expect(findAction(DEFAULT_SHORTCUTS, "KeyA")).toBe("add:audio"));
  it("reassigning a key removes it from previous action", () => {
    const m = assign(DEFAULT_SHORTCUTS, "add:wait", "KeyA");
    expect(findAction(m, "KeyA")).toBe("add:wait");
    expect(m["add:audio"]).toBeUndefined();
  });
  it("combo includes modifiers", () => expect(comboOf({ code: "KeyL", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe("Ctrl+KeyL"));
});
