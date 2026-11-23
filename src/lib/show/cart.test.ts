import { describe, expect, it } from "vitest";
import { keyTaken, padForKey } from "./cart";
import type { CartPad } from "./types";

const pad = (id: string, key?: string, outputId = "#1") => ({ id, key, outputId, type: "audio" } as unknown as CartPad);

describe("cart", () => {
  it("finds the pad for a key regardless of case", () => {
    expect(padForKey([pad("a", "q"), pad("b", "W")], "w")?.id).toBe("b");
    expect(padForKey([pad("a", "q")], "Enter")).toBeUndefined();
  });
  it("each pad keeps its own output", () => {
    const pads = [pad("a", "1", "#1"), pad("b", "2", "#3")];
    expect(padForKey(pads, "2")?.outputId).toBe("#3");
  });
  it("detects duplicate keys", () => {
    expect(keyTaken([pad("a", "q"), pad("b")], "Q", "b")).toBe(true);
    expect(keyTaken([pad("a", "q")], "q", "a")).toBe(false);
  });
});
