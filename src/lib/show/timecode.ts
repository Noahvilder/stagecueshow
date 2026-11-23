/** SMPTE timecode: conversion, MTC (MIDI) and LTC (audio) encode/decode. */
export type Fps = 24 | 25 | 29.97 | 30;
export const FPS_LIST: Fps[] = [24, 25, 29.97, 30];
export interface Tc { h: number; m: number; s: number; f: number }

/** Nominal frames per second (29.97 DF counts in 30s). */
export const nominal = (fps: Fps) => (fps === 29.97 ? 30 : fps);
/** Real frames per second. */
export const realFps = (fps: Fps) => (fps === 29.97 ? 30000 / 1001 : fps);
const isDf = (fps: Fps) => fps === 29.97;

export function framesToTc(n: number, fps: Fps): Tc {
  n = Math.max(0, Math.floor(n));
  const nf = nominal(fps);
  if (isDf(fps)) {
    const d = Math.floor(n / 17982), m = n % 17982;
    n += 18 * d + (m >= 2 ? 2 * Math.floor((m - 2) / 1798) : 0);
  }
  const f = n % nf, totS = Math.floor(n / nf);
  return { h: Math.floor(totS / 3600) % 24, m: Math.floor(totS / 60) % 60, s: totS % 60, f };
}

export function tcToFrames(t: Tc, fps: Fps): number {
  const nf = nominal(fps);
  const totM = t.h * 60 + t.m;
  let n = (totM * 60 + t.s) * nf + t.f;
  if (isDf(fps)) n -= 2 * (totM - Math.floor(totM / 10));
  return n;
}

const p2 = (x: number) => String(x).padStart(2, "0");
export const formatTc = (t: Tc, fps: Fps = 25) => `${p2(t.h)}:${p2(t.m)}:${p2(t.s)}${isDf(fps) ? ";" : ":"}${p2(t.f)}`;

export function parseTc(s: string): Tc | null {
  const m = s.trim().match(/^(\d{1,2})[:.](\d{1,2})[:.](\d{1,2})[:;.](\d{1,2})$/);
  if (!m) return null;
  const [h, mi, se, f] = m.slice(1).map(Number) as [number, number, number, number];
  if (mi > 59 || se > 59 || h > 23 || f > 29) return null;
  return { h, m: mi, s: se, f };
}

/* ---------- MTC ---------- */
const RATE_CODE: Record<string, number> = { "24": 0, "25": 1, "29.97": 2, "30": 3 };
const CODE_RATE: Fps[] = [24, 25, 29.97, 30];

/** Quarter-frame message (0..7) for the given timecode. */
export function mtcQuarter(t: Tc, piece: number, fps: Fps): [number, number] {
  const v = [t.f & 15, t.f >> 4, t.s & 15, t.s >> 4, t.m & 15, t.m >> 4, t.h & 15, ((t.h >> 4) & 1) | (RATE_CODE[String(fps)]! << 1)][piece]!;
  return [0xf1, (piece << 4) | v];
}
/** Full-frame SysEx (locate). */
export function mtcFull(t: Tc, fps: Fps): number[] {
  return [0xf0, 0x7f, 0x7f, 0x01, 0x01, (RATE_CODE[String(fps)]! << 5) | t.h, t.m, t.s, t.f, 0xf7];
}

/** Assembles incoming MTC into timecode. */
export class MtcReader {
  private v = new Array<number>(8).fill(0);
  private seen = 0;
  fps: Fps = 25;
  /** Returns the decoded frame count when a timecode is complete. */
  push(d: ArrayLike<number>): number | null {
    if (d[0] === 0xf1 && d.length >= 2) {
      const piece = d[1]! >> 4;
      this.v[piece] = d[1]! & 15;
      this.seen |= 1 << piece;
      if (piece === 7 && this.seen === 255) {
        this.seen = 0;
        const v = this.v;
        this.fps = CODE_RATE[(v[7]! >> 1) & 3]!;
        const t = { f: v[0]! | (v[1]! << 4), s: v[2]! | (v[3]! << 4), m: v[4]! | (v[5]! << 4), h: v[6]! | ((v[7]! & 1) << 4) };
        return tcToFrames(t, this.fps) + 2; // a block takes 2 frames to arrive
      }
      return null;
    }
    if (d[0] === 0xf0 && d[1] === 0x7f && d[3] === 0x01 && d[4] === 0x01 && d.length >= 10) {
      this.fps = CODE_RATE[(d[5]! >> 5) & 3]!;
      return tcToFrames({ h: d[5]! & 31, m: d[6]!, s: d[7]!, f: d[8]! }, this.fps);
    }
    return null;
  }
}

/* ---------- LTC (SMPTE 12M) ---------- */
const SYNC = [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1];

/** 80 bits of one LTC frame, LSB first. */
export function ltcBits(t: Tc, fps: Fps): number[] {
  const b = new Array<number>(80).fill(0);
  const put = (at: number, n: number, v: number) => { for (let i = 0; i < n; i++) b[at + i] = (v >> i) & 1; };
  put(0, 4, t.f % 10); put(8, 2, Math.floor(t.f / 10));
  b[10] = isDf(fps) ? 1 : 0;
  put(16, 4, t.s % 10); put(24, 3, Math.floor(t.s / 10));
  put(32, 4, t.m % 10); put(40, 3, Math.floor(t.m / 10));
  put(48, 4, t.h % 10); put(56, 2, Math.floor(t.h / 10));
  // polarity correction bit: make the number of zeros even
  const pol = fps === 25 ? 59 : 27;
  for (let i = 0; i < 16; i++) b[64 + i] = SYNC[i]!;
  const total = b.reduce((a, x) => a + x, 0);
  b[pol] = (80 - total) % 2 === 0 ? 0 : 1;
  return b;
}

export function decodeLtcBits(b: number[]): { tc: Tc; df: boolean } {
  const get = (at: number, n: number) => { let v = 0; for (let i = 0; i < n; i++) v |= b[at + i]! << i; return v; };
  return {
    tc: { f: get(0, 4) + 10 * get(8, 2), s: get(16, 4) + 10 * get(24, 3), m: get(32, 4) + 10 * get(40, 3), h: get(48, 4) + 10 * get(56, 2) },
    df: b[10] === 1,
  };
}

/** Biphase-mark audio renderer that keeps phase across chunks. */
export class LtcWriter {
  private level = 1;
  constructor(public fps: Fps, public sampleRate: number, public amp = 0.5) {}
  /** Renders the frames [start, start+count) into a Float32Array. */
  render(start: number, count: number): Float32Array<ArrayBuffer> {
    const spb = this.sampleRate / (realFps(this.fps) * 80);
    const len = Math.round((count * 80) * spb);
    const out = new Float32Array(len);
    let bits: number[] = [];
    for (let k = 0; k < count; k++) bits = bits.concat(ltcBits(framesToTc(start + k, this.fps), this.fps));
    let cur = -1, half = false;
    for (let i = 0; i < len; i++) {
      const pos = i / spb;
      const bi = Math.floor(pos);
      const inHalf = pos - bi >= 0.5;
      if (bi !== cur) { this.level = -this.level; cur = bi; half = false; }
      else if (inHalf && !half) { half = true; if (bits[bi]) this.level = -this.level; }
      out[i] = this.level * this.amp;
    }
    return out;
  }
}

/** Decodes LTC from audio samples (any speed close to nominal). */
export class LtcReader {
  private last = 0;
  private run = 0;
  private cell = 0;
  private pendingShort = false;
  private bits: number[] = [];
  constructor(public sampleRate: number) {}
  /** Calls onFrame for every decoded frame. */
  push(x: Float32Array, onFrame: (tc: Tc, df: boolean) => void) {
    for (let i = 0; i < x.length; i++) {
      const s = x[i]! >= 0 ? 1 : -1;
      this.run++;
      if (s === this.last || this.last === 0) { this.last = s; continue; }
      this.last = s;
      const d = this.run; this.run = 0;
      if (!this.cell) { this.cell = d * 1.5; }
      if (d > this.cell * 0.75) {
        this.cell = this.cell * 0.9 + d * 0.1;
        this.pendingShort = false;
        this.bit(0, onFrame);
      } else {
        this.cell = this.cell * 0.9 + d * 2 * 0.1;
        if (this.pendingShort) { this.pendingShort = false; this.bit(1, onFrame); }
        else this.pendingShort = true;
      }
      if (d > this.sampleRate / 100) { this.cell = 0; this.bits = []; }
    }
  }
  private bit(v: number, onFrame: (tc: Tc, df: boolean) => void) {
    this.bits.push(v);
    if (this.bits.length > 80) this.bits.shift();
    if (this.bits.length === 80 && SYNC.every((s, i) => this.bits[64 + i] === s)) {
      const r = decodeLtcBits(this.bits);
      onFrame(r.tc, r.df);
      this.bits = [];
    }
  }
}
