import { describe, expect, it } from "vitest";
import type { Show } from "./types";
import { preflight } from "./preflight";
import { findReplace } from "./findReplace";
import { deepCues, flatten, moveCue, nextStandbyIndex, parseShow, shiftCue, midiBytes } from "./logic";
import { resolveOut } from "./patch";
import { acceptGo } from "./safety";
import { framesToTc, tcToFrames, ltcBits, decodeLtcBits, mtcQuarter, type Fps } from "./timecode";

// Monster show: 40 songs x 30 cues incl. nested groups = 1.200+ cues
const base = { follow: "manual", preWait: 0, postWait: 0 };
function monster(): Show {
  const songs = Array.from({ length: 40 }, (_, s) => ({
    id: `s${s}`, name: `Sang ${s}`,
    cues: Array.from({ length: 30 }, (_, i) => {
      const id = `c${s}_${i}`;
      const k = i % 6;
      if (k === 0) return { ...base, id, name: id, type: "audio", fileId: `f${id}`, outputId: `#${(i % 8) + 1}` };
      if (k === 1) return { ...base, id, name: id, type: "midi", messages: [{ id: id + "m", port: `#${(i % 4) + 1}`, kind: "noteon", channel: (i % 16) + 1, data1: 60, data2: 100 }] };
      if (k === 2) return { ...base, id, name: id, type: "fade", target: `c${s}_${i - 2}`, duration: 2 };
      if (k === 3) return { ...base, id, name: id, type: "group", children: [
        { ...base, id: id + "a", name: "n", type: "audio", fileId: "fx", outputId: "#2" },
        { ...base, id: id + "g", name: "n", type: "group", children: [{ ...base, id: id + "gm", name: "n", type: "midi", messages: [{ id: id + "x", port: "#1", kind: "cc", channel: 1, data1: 7, data2: 0 }] }] },
      ] };
      if (k === 4) return { ...base, id, name: id, type: "stop", target: "all", duration: 0 };
      return { ...base, id, name: id, type: "memo", text: "x" };
    }),
  }));
  return { id: "m", name: "Monster", songs } as unknown as Show;
}

const time = (fn: () => void) => { const t = performance.now(); fn(); return performance.now() - t; };

describe("stresstest: kæmpe show", () => {
  const show = monster();

  it("indeholder over 1.200 cues inkl. grupper", () => {
    expect(deepCues(flatten(show)).length).toBeGreaterThan(1400);
  });

  it("Tjek show på hele showet er hurtigt og finder ingen falske fejl", () => {
    let r: ReturnType<typeof preflight> = [];
    const ms = time(() => { r = preflight(show, []); });
    expect(r).toEqual([]);
    expect(ms).toBeLessThan(200);
  });

  it("finder en manglende lydfil blandt 1.200 cues", () => {
    expect(preflight(show, ["fc39_0"]).some((x) => x.cueId === "c39_0")).toBe(true);
  });

  it("Find & Erstat flytter alle MIDI #1 til #9 i hele showet", () => {
    const r = findReplace(show, { mode: "midiPort", from: "#1", to: "#9" });
    expect(r.hits.length).toBeGreaterThan(40);
    expect(JSON.stringify(r.show)).not.toContain('"port":"#1"');
  });

  it("gem/åbn showfil 50 gange uden datatab", () => {
    const first = parseShow(JSON.stringify(show));
    let s = first;
    for (let i = 0; i < 50; i++) s = parseShow(JSON.stringify(s));
    expect(JSON.stringify(s)).toBe(JSON.stringify(first));
    expect(deepCues(flatten(s)).length).toBe(deepCues(flatten(show)).length);
  });

  it("2.000 tilfældige flyt af cues mister eller dublerer intet", () => {
    let s = show;
    const ids = flatten(show).map((c) => c.id);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2000; i++) {
      const id = ids[Math.floor(rnd() * ids.length)]!;
      s = rnd() < 0.5 ? moveCue(s, id, `s${Math.floor(rnd() * 40)}`, null) : shiftCue(s, id, rnd() < 0.5 ? -1 : 1);
    }
    expect(flatten(s).map((c) => c.id).sort()).toEqual([...ids].sort());
  });

  it("GO gennem hele showet rammer hvert cue præcis én gang", () => {
    const flat = flatten(show);
    let i = 0, fired = 0;
    while (i >= 0 && i < flat.length && fired < 5000) { fired++; i = nextStandbyIndex(flat, i); }
    expect(fired).toBe(flat.length);
  });

  it("GO-hamring: 20 tryk/sek i 60 sek giver kun ét GO pr. 500 ms", () => {
    let last: number | null = null, accepted = 0;
    for (let t = 0; t < 60000; t += 50) if (acceptGo(last, t, 500)) { accepted++; last = t; }
    expect(accepted).toBe(120);
  });

  it("patch-matrix slår 100.000 opslag op hurtigt", () => {
    const ms = time(() => { for (let i = 0; i < 100000; i++) resolveOut(show, "audio", `#${(i % 8) + 1}`); });
    expect(ms).toBeLessThan(500);
  });

  it("alle MIDI-beskeder giver gyldige bytes", () => {
    for (const c of deepCues(flatten(show))) if (c.type === "midi") for (const m of c.messages) for (const b of midiBytes(m)) expect(b).toBeGreaterThanOrEqual(0), expect(b).toBeLessThan(256);
  });
});

describe("stresstest: tidskode", () => {
  for (const fps of [24, 25, 29.97, 30] as Fps[]) {
    it(`${fps} fps: 3 timers tidskode tur-retur uden fejl (LTC + MTC)`, () => {
      const total = Math.floor(3 * 3600 * (fps === 29.97 ? 29.97 : fps));
      for (let n = 0; n < total; n += 7) {
        const tc = framesToTc(n, fps);
        expect(tcToFrames(tc, fps)).toBe(n);
        if (n % 701 === 0) {
          expect(decodeLtcBits(ltcBits(tc, fps)).tc).toEqual(tc);
          for (let p = 0; p < 8; p++) { const [a, b] = mtcQuarter(tc, p, fps); expect(a).toBe(0xf1); expect(b).toBeLessThan(128); }
        }
      }
    });
  }
});
