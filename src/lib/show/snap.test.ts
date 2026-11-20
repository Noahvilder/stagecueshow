import { describe, expect, it } from "vitest";
import { snapRect } from "./snap";
const scr = { w: 1000, h: 800 };
describe("window snapping", () => {
  it("free leaves position untouched", () => expect(snapRect({ x: 13, y: 7, w: 300, h: 200 }, [], "free", scr)).toEqual({ x: 13, y: 7, w: 300, h: 200 }));
  it("grid rounds to 24px steps", () => expect(snapRect({ x: 13, y: 37, w: 300, h: 200 }, [], "grid", scr)).toMatchObject({ x: 24, y: 48 }));
  it("magnet sticks within 15px to a neighbour edge", () => expect(snapRect({ x: 410, y: 300, w: 300, h: 200 }, [{ x: 100, y: 100, w: 300, h: 200 }], "magnet", scr)).toMatchObject({ x: 400 }));
  it("magnet ignores edges further away", () => expect(snapRect({ x: 430, y: 300, w: 300, h: 200 }, [{ x: 100, y: 100, w: 300, h: 200 }], "magnet", scr)).toMatchObject({ x: 430 }));
});
