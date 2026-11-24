import { describe, it, expect } from "vitest";
import { encodeArtNet, encodeSacn, parseQuick, DmxOut, sacnHost } from "./dmx";

describe("dmx", () => {
  it("Art-Net header, universe and data", () => {
    const lv = new Uint8Array(512); lv[0] = 255; lv[511] = 7;
    const p = encodeArtNet(lv, 2);
    expect(new TextDecoder().decode(p.subarray(0, 7))).toBe("Art-Net");
    expect(p[9]).toBe(0x50); expect(p[14]).toBe(1); expect(p[16]).toBe(2); expect(p[18]).toBe(255); expect(p[529]).toBe(7);
  });
  it("sACN universe and data", () => {
    const lv = new Uint8Array(512); lv[0] = 128;
    const p = encodeSacn(lv, 3);
    expect(p.length).toBe(638); expect((p[113]! << 8) | p[114]!).toBe(3); expect(p[126]).toBe(128);
    expect(sacnHost(3)).toBe("239.255.0.3");
  });
  it("quick input", () => {
    const m = parseQuick("1-4 @ 80"); expect(m).not.toBe("clear");
    expect([...(m as Map<number, number>).entries()]).toEqual([[1, 204], [2, 204], [3, 204], [4, 204]]);
    expect((parseQuick("10 @ 255 dmx") as Map<number, number>).get(10)).toBe(255);
    expect((parseQuick("1+3 @ full") as Map<number, number>).size).toBe(2);
    expect(parseQuick("clear")).toBe("clear");
    expect(parseQuick("600 @ 50")).toBeNull();
  });
  it("fades halfway and finishes, untouched channels stay", () => {
    const d = new DmxOut(); d.levels[5] = 100;
    d.run({ values: [{ ch: 1, v: 200 }], fade: 2 }, 0);
    d.step(1000); expect(Math.round(d.levels[1]!)).toBe(100);
    d.step(2000); expect(d.levels[1]).toBe(200); expect(d.levels[5]).toBe(100);
  });
  it("full scene zeroes other channels", () => {
    const d = new DmxOut(); d.levels[5] = 100;
    d.run({ values: [{ ch: 1, v: 50 }], fade: 0, full: true }, 0);
    d.step(0); expect(d.levels[5]).toBe(0); expect(d.levels[1]).toBe(50);
  });
});
