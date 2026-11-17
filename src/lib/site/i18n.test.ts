import { describe, it, expect } from "vitest";
import { detectLang, PRICES } from "./i18n";
describe("i18n", () => {
  it("detects da/de, falls back to en", () => {
    expect(detectLang("da-DK")).toBe("da");
    expect(detectLang("de-AT")).toBe("de");
    expect(detectLang("fr-FR")).toBe("en");
  });
  it("USD pricing for English", () => {
    expect(PRICES.en).toEqual({ monthly: "$9.99", yearly: "$79", lifetime: "$149" });
  });
});
