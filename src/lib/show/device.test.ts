import { describe, it, expect } from "vitest";
import { MAX_PULT_DEVICES, guessDeviceName } from "./device";
describe("pult devices", () => {
  it("allows max 3 pult devices", () => expect(MAX_PULT_DEVICES).toBe(3));
  it("names a Windows Chrome device", () => expect(guessDeviceName("Mozilla/5.0 (Windows NT 10.0) Chrome/120")).toBe("Windows · Chrome"));
});
