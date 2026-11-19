export const METERS = ["1/4","2/4","3/4","4/4","5/4","6/4","3/8","5/8","6/8","7/8","9/8","12/8"] as const;
export type Meter = (typeof METERS)[number];
export type ClickSound = "wood" | "beep" | "rim" | "cowbell" | "voice";
export const CLICK_SOUNDS: { id: ClickSound; label: string }[] = [
  { id: "wood", label: "Træblok" }, { id: "beep", label: "Bip" }, { id: "rim", label: "Rim" }, { id: "cowbell", label: "Koklokke" }, { id: "voice", label: "Stemme (1-2-3-4)" },
];

export interface ClickSettings {
  meter: Meter;
  bars: number;
  startBpm: number;
  endBpm: number; // = startBpm for fixed tempo
  sound: ClickSound;
  accent: boolean;
  accentGain: number; // 0..1 extra loudness on beat 1
  volume: number; // 0..1
}

export const beatsPerBar = (m: Meter) => Number(m.split("/")[0]);
/** Eighth-note meters count in eighths: one click = one eighth (half a quarter). */
export const beatUnit = (m: Meter) => Number(m.split("/")[1]);

export interface Beat { time: number; bar: number; beat: number; accent: boolean }

/** Click times with an even (linear) tempo change from startBpm to endBpm across all clicks. */
export function beatTimes(s: ClickSettings): Beat[] {
  const per = beatsPerBar(s.meter);
  const total = Math.max(1, Math.round(s.bars)) * per;
  const unitScale = 4 / beatUnit(s.meter);
  const out: Beat[] = [];
  let t = 0;
  for (let i = 0; i < total; i++) {
    out.push({ time: t, bar: Math.floor(i / per) + 1, beat: (i % per) + 1, accent: s.accent && i % per === 0 });
    const f = total > 1 ? i / (total - 1) : 0;
    const bpm = s.startBpm + (s.endBpm - s.startBpm) * f;
    t += (60 / Math.max(1, bpm)) * unitScale;
  }
  return out;
}

export function clickLength(s: ClickSettings): number {
  const b = beatTimes(s);
  const last = b[b.length - 1]!;
  const lastBpm = s.endBpm;
  return last.time + (60 / Math.max(1, lastBpm)) * (4 / beatUnit(s.meter));
}

function scheduleClick(ctx: BaseAudioContext, dest: AudioNode, at: number, sound: ClickSound, accent: boolean, gain: number) {
  if (sound === "voice") return;
  const base = { wood: 1200, beep: 1000, rim: 2200, cowbell: 800 }[sound as Exclude<ClickSound, "voice">];
  const freq = accent ? base * 1.5 : base;
  const dur = sound === "beep" ? 0.06 : sound === "cowbell" ? 0.12 : 0.03;
  const o = ctx.createOscillator();
  o.type = sound === "beep" ? "sine" : sound === "cowbell" ? "square" : "triangle";
  o.frequency.setValueAtTime(freq, at);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + dur + 0.01);
}

const voiceCache = new Map<BaseAudioContext, Promise<AudioBuffer[]>>();
/** Spoken counts "one".."four"; beats above 4 reuse them in a 1-4 cycle. */
function loadVoice(ctx: BaseAudioContext): Promise<AudioBuffer[]> {
  let p = voiceCache.get(ctx);
  if (!p) {
    p = Promise.all([1, 2, 3, 4].map(async (n) => ctx.decodeAudioData(await (await fetch(`/voice/${n}.wav`)).arrayBuffer())));
    voiceCache.set(ctx, p);
  }
  return p;
}

export async function scheduleAll(ctx: BaseAudioContext, s: ClickSettings, offset: number) {
  const voice = s.sound === "voice" ? await loadVoice(ctx) : null;
  for (const b of beatTimes(s)) {
    const g = s.volume * (b.accent ? 1 : 1 - s.accentGain * 0.6);
    if (voice) {
      const src = ctx.createBufferSource();
      src.buffer = voice[(b.beat - 1) % 4]!;
      const vg = ctx.createGain(); vg.gain.value = g * 1.4;
      src.connect(vg).connect(ctx.destination);
      src.start(offset + b.time);
      continue;
    }
    scheduleClick(ctx, ctx.destination, offset + b.time, s.sound, b.accent, g);
  }
}

export async function renderClickWav(s: ClickSettings): Promise<Blob> {
  const rate = 44100;
  const len = Math.ceil((clickLength(s) + 0.2) * rate);
  const ctx = new OfflineAudioContext(2, len, rate);
  await scheduleAll(ctx, s, 0);
  return encodeWav(await ctx.startRendering());
}

function encodeWav(buf: AudioBuffer): Blob {
  const ch = buf.numberOfChannels, n = buf.length;
  const view = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o: number, str: string) => [...str].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); view.setUint32(4, 36 + n * ch * 2, true); w(8, "WAVE"); w(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, ch, true);
  view.setUint32(24, buf.sampleRate, true); view.setUint32(28, buf.sampleRate * ch * 2, true);
  view.setUint16(32, ch * 2, true); view.setUint16(34, 16, true); w(36, "data"); view.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    const v = Math.max(-1, Math.min(1, data[c]![i]!));
    view.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2;
  }
  return new Blob([view], { type: "audio/wav" });
}
