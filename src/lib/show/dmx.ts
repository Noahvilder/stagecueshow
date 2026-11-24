/** DMX output: Art-Net / sACN encoding, 512-channel state with timed fades, quick "1-4 @ 80" input. */
import type { DmxCue, DmxSettings } from "./types";

export const DMX_DEFAULTS: DmxSettings = { protocol: "artnet", host: "2.255.255.255", universe: 1, hz: 40 };

/** Art-Net ArtDmx packet (universe is 1-based in the UI, 0-based on the wire). */
export function encodeArtNet(levels: Uint8Array, universe: number, seq = 0): Uint8Array {
  const u = Math.max(0, universe - 1);
  const head = [..."Art-Net"].map((c) => c.charCodeAt(0));
  const p = new Uint8Array(18 + 512);
  p.set(head, 0); p[7] = 0;
  p[8] = 0x00; p[9] = 0x50; // OpDmx little-endian
  p[10] = 0; p[11] = 14; // protocol version
  p[12] = seq & 0xff; p[13] = 0;
  p[14] = u & 0xff; p[15] = (u >> 8) & 0x7f;
  p[16] = 0x02; p[17] = 0x00; // length 512 big-endian
  p.set(levels.subarray(0, 512), 18);
  return p;
}

/** sACN (E1.31) data packet. */
export function encodeSacn(levels: Uint8Array, universe: number, seq = 0, cid = new Uint8Array(16).fill(0x5c)): Uint8Array {
  const p = new Uint8Array(638);
  const dv = new DataView(p.buffer);
  dv.setUint16(0, 0x0010); dv.setUint16(2, 0);
  p.set([0x41, 0x53, 0x43, 0x2d, 0x45, 0x31, 0x2e, 0x31, 0x37, 0, 0, 0], 4);
  dv.setUint16(16, 0x7000 | (638 - 16)); dv.setUint32(18, 0x00000004); p.set(cid, 22);
  dv.setUint16(38, 0x7000 | (638 - 38)); dv.setUint32(40, 0x00000002);
  p.set(new TextEncoder().encode("StageCue").subarray(0, 63), 44);
  p[108] = 100; dv.setUint16(109, 0); p[111] = seq & 0xff; p[112] = 0; dv.setUint16(113, universe);
  dv.setUint16(115, 0x7000 | (638 - 115)); p[117] = 0x02; p[118] = 0xa1; dv.setUint16(119, 0); dv.setUint16(121, 1); dv.setUint16(123, 513);
  p[125] = 0; p.set(levels.subarray(0, 512), 126);
  return p;
}

/** sACN multicast group for a universe. */
export const sacnHost = (universe: number) => `239.255.${(universe >> 8) & 0xff}.${universe & 0xff}`;

/** "1-4 @ 80" (percent), "10 @ 255" with "dmx" or ":" for raw, "1+3 @ 50", "clear". Returns ch → 0-255, or null when invalid. */
export function parseQuick(input: string): Map<number, number> | "clear" | null {
  const s = input.trim().toLowerCase();
  if (s === "clear" || s === "blackout" || s === "bo") return "clear";
  const m = s.match(/^([\d\s,+\-thru]+)\s*@\s*(full|ff|\d+(?:\.\d+)?)\s*(dmx|raw)?$/);
  if (!m) return null;
  const raw = !!m[3];
  const val = m[2] === "full" || m[2] === "ff" ? 255 : raw ? Math.round(Number(m[2])) : Math.round((Number(m[2]) / 100) * 255);
  if (val < 0 || val > 255) return null;
  const out = new Map<number, number>();
  for (const part of m[1]!.replace(/thru/g, "-").split(/[,+\s]+/).filter(Boolean)) {
    const r = part.split("-").map((x) => parseInt(x, 10));
    const a = r[0]!, b = r[1] ?? a;
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b > 512 || a > b) return null;
    for (let c = a; c <= b; c++) out.set(c, val);
  }
  return out.size ? out : null;
}

export const pct = (v: number) => Math.round((v / 255) * 100);

type Fade = { from: Float32Array; to: Map<number, number>; start: number; dur: number };
type TauriWin = { __TAURI_INTERNALS__?: { invoke: (cmd: string, args: unknown) => Promise<unknown> } };

/** Holds the live 512 levels, runs fades and sends frames at a fixed rate. */
export class DmxOut {
  levels = new Float32Array(513); // index = channel (1-512)
  private fades: Fade[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private seq = 0;
  private subs = new Set<() => void>();
  settings: DmxSettings = DMX_DEFAULTS;
  onError: (m: string) => void = () => {};
  private errShown = false;

  configure(s: DmxSettings | undefined) { this.settings = { ...DMX_DEFAULTS, ...s }; this.restart(); }
  subscribe(f: () => void) { this.subs.add(f); return () => { this.subs.delete(f); }; }
  snapshot(): Uint8Array { const o = new Uint8Array(512); for (let c = 1; c <= 512; c++) o[c - 1] = Math.round(this.levels[c]!); return o; }

  /** Apply a cue: only listed channels change, unless the cue is a full scene (others go to 0). */
  run(cue: Pick<DmxCue, "values" | "fade" | "full">, now = performance.now()) {
    const to = new Map<number, number>();
    if (cue.full) for (let c = 1; c <= 512; c++) to.set(c, 0);
    for (const v of cue.values) to.set(v.ch, v.v);
    this.fadeTo(to, cue.fade, now);
  }
  set(ch: number, v: number) { this.fades.forEach((f) => f.to.delete(ch)); this.levels[ch] = v; this.tick(); }
  blackout(sec = 0) { const to = new Map<number, number>(); for (let c = 1; c <= 512; c++) to.set(c, 0); this.fadeTo(to, sec); }
  fadeTo(to: Map<number, number>, sec: number, now = performance.now()) {
    for (const f of this.fades) for (const c of to.keys()) f.to.delete(c); // latest takes precedence (LTP)
    if (sec <= 0) { for (const [c, v] of to) this.levels[c] = v; this.tick(); return; }
    this.fades.push({ from: this.levels.slice(), to, start: now, dur: sec * 1000 });
    this.restart();
  }
  /** Advance fades to `now`; exported for tests. */
  step(now = performance.now()) {
    this.fades = this.fades.filter((f) => {
      const k = Math.min(1, (now - f.start) / f.dur);
      for (const [c, v] of f.to) this.levels[c] = f.from[c]! + (v - f.from[c]!) * k;
      return k < 1 && f.to.size > 0;
    });
  }
  private tick() { this.step(); this.send(); this.subs.forEach((f) => f()); }
  private restart() {
    if (this.timer) clearInterval(this.timer);
    if (typeof window === "undefined") return;
    this.timer = setInterval(() => this.tick(), 1000 / Math.max(1, Math.min(44, this.settings.hz)));
  }
  private send() {
    const t = (globalThis as unknown as TauriWin).__TAURI_INTERNALS__;
    if (!t) return;
    const s = this.settings, lv = this.snapshot();
    this.seq = (this.seq + 1) % 256;
    const sacn = s.protocol === "sacn";
    const data = sacn ? encodeSacn(lv, s.universe, this.seq) : encodeArtNet(lv, s.universe, this.seq);
    const host = sacn && !s.host ? sacnHost(s.universe) : s.host || "2.255.255.255";
    t.invoke("send_udp", { host, port: sacn ? 5568 : 6454, data: Array.from(data) }).then(() => { this.errShown = false; }, (e) => {
      if (!this.errShown) { this.errShown = true; this.onError(`DMX kunne ikke sendes: ${String(e)}`); }
    });
  }
  dispose() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}

export const dmx = new DmxOut();
