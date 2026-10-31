import { getAudio } from "./audioStore";
import { dbToGain, midiBytes } from "./logic";
import type { AudioCue, Cue, MidiMsg } from "./types";

interface Player {
  cue: AudioCue;
  ctx: AudioContext;
  buffer: AudioBuffer;
  gain: GainNode;
  pan: StereoPannerNode;
  source: AudioBufferSourceNode | null;
  offset: number;
  startedCtx: number;
  paused: boolean;
}

export interface ActiveRow {
  key: string;
  cueId: string;
  name: string;
  type: string;
  state: "pre" | "run" | "paused";
  elapsed: number;
  duration: number | null;
}

type AnyCtx = AudioContext & { setSinkId?: (id: string) => Promise<void> };

export class Engine {
  private ctxs = new Map<string, AudioContext>();
  private buffers = new Map<string, AudioBuffer>();
  private players = new Map<string, Player>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private pending = new Map<string, { cueId: string; name: string; type: string; start: number; dur: number }>();
  private waits = new Map<string, { name: string; start: number; dur: number }>();
  midi: MIDIAccess | null = null;
  onError: (msg: string) => void = () => {};

  async initMidi(): Promise<string[]> {
    if (!navigator.requestMIDIAccess) throw new Error("Web MIDI understøttes ikke i denne browser (brug Chrome/Edge)");
    this.midi = await navigator.requestMIDIAccess({ sysex: false });
    return this.midiOutputs();
  }
  midiOutputs(): string[] {
    return this.midi ? Array.from(this.midi.outputs.values()).map((o) => o.name ?? o.id) : [];
  }
  sendMidi(m: MidiMsg) {
    const out = this.midi && Array.from(this.midi.outputs.values()).find((o) => (o.name ?? o.id) === m.port);
    if (!out) return this.onError(`MIDI-port ikke fundet: ${m.port || "(ingen valgt)"}`);
    out.send(midiBytes(m));
  }

  private async ctx(outputId: string): Promise<AudioContext> {
    let c = this.ctxs.get(outputId);
    if (!c) {
      c = new AudioContext({ latencyHint: "interactive" });
      if (outputId) {
        const any = c as AnyCtx;
        if (any.setSinkId) await any.setSinkId(outputId).catch(() => this.onError("Kunne ikke vælge lydudgang – bruger standard"));
        else this.onError("Browseren understøtter ikke valg af lydudgang");
      }
      this.ctxs.set(outputId, c);
    }
    if (c.state === "suspended") await c.resume();
    return c;
  }
  unlock() {
    this.ctxs.forEach((c) => c.state === "suspended" && c.resume());
  }
  invalidateBuffer(fileId: string) {
    this.buffers.delete(fileId);
  }

  private async buffer(fileId: string, ctx: AudioContext) {
    const hit = this.buffers.get(fileId);
    if (hit) return hit;
    const blob = await getAudio(fileId);
    if (!blob) throw new Error("Lydfil mangler – vælg filen igen");
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    this.buffers.set(fileId, buf);
    return buf;
  }

  async preload(cues: Cue[]) {
    for (const c of cues) if (c.type === "audio" && c.fileId) await this.buffer(c.fileId, await this.ctx(c.outputId)).catch(() => {});
  }

  private startSource(p: Player) {
    const src = p.ctx.createBufferSource();
    src.buffer = p.buffer;
    src.loop = p.cue.loop;
    src.connect(p.gain);
    src.onended = () => {
      if (p.source === src && !p.paused) this.removePlayer(p.cue.id);
    };
    p.source = src;
    p.startedCtx = p.ctx.currentTime;
    src.start(0, p.offset % p.buffer.duration);
  }

  private async playAudio(cue: AudioCue) {
    if (!cue.fileId) return this.onError(`"${cue.name}": ingen lydfil valgt`);
    const ctx = await this.ctx(cue.outputId);
    const buffer = await this.buffer(cue.fileId, ctx);
    this.removePlayer(cue.id);
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-1, Math.min(1, cue.pan));
    gain.connect(pan).connect(ctx.destination);
    const target = dbToGain(cue.volume);
    const now = ctx.currentTime;
    if (cue.fadeIn > 0) {
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(target, now + cue.fadeIn);
    } else gain.gain.setValueAtTime(target, now);
    if (!cue.loop && cue.fadeOut > 0 && buffer.duration > cue.fadeOut) {
      const t = now + buffer.duration - cue.fadeOut;
      gain.gain.setValueAtTime(target, t);
      gain.gain.linearRampToValueAtTime(0, now + buffer.duration);
    }
    const p: Player = { cue, ctx, buffer, gain, pan, source: null, offset: 0, startedCtx: now, paused: false };
    this.players.set(cue.id, p);
    this.startSource(p);
  }

  private removePlayer(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    if (p.source) {
      p.source.onended = null;
      try {
        p.source.stop();
      } catch {}
    }
    p.gain.disconnect();
    this.players.delete(id);
  }

  private targets(target: string): Player[] {
    return target === "all" ? [...this.players.values()] : [this.players.get(target)].filter(Boolean) as Player[];
  }

  private fade(p: Player, to: number, dur: number, stopAfter: boolean) {
    const g = p.gain.gain;
    const now = p.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    if (dur > 0) g.linearRampToValueAtTime(to, now + dur);
    else g.setValueAtTime(to, now);
    if (stopAfter) this.later(dur, () => this.removePlayer(p.cue.id), true);
  }

  private togglePause(p: Player) {
    if (!p.paused) {
      p.offset += p.ctx.currentTime - p.startedCtx;
      p.paused = true;
      if (p.source) {
        p.source.onended = null;
        p.source.stop();
      }
      p.source = null;
    } else {
      p.paused = false;
      this.startSource(p);
    }
  }

  durationOf(cue: Cue): number {
    switch (cue.type) {
      case "audio": {
        const b = cue.fileId ? this.buffers.get(cue.fileId) : undefined;
        return cue.loop ? Infinity : b?.duration ?? 0;
      }
      case "wait":
      case "fade":
      case "stop":
        return cue.duration;
      default:
        return 0;
    }
  }

  async execute(cue: Cue) {
    try {
      switch (cue.type) {
        case "audio":
          await this.playAudio(cue);
          break;
        case "midi":
          cue.messages.forEach((m) => this.sendMidi(m));
          break;
        case "fade":
          this.targets(cue.target).forEach((p) => this.fade(p, dbToGain(cue.volume), cue.duration, cue.stopAfter));
          break;
        case "stop":
          this.targets(cue.target).forEach((p) =>
            cue.duration > 0 ? this.fade(p, 0, cue.duration, true) : this.removePlayer(p.cue.id),
          );
          break;
        case "pause":
          this.targets(cue.target).forEach((p) => this.togglePause(p));
          break;
        case "wait": {
          const key = cue.id;
          this.waits.set(key, { name: cue.name, start: performance.now(), dur: cue.duration });
          this.later(cue.duration, () => this.waits.delete(key));
          break;
        }
        case "memo":
          break;
      }
    } catch (e) {
      this.onError(`"${cue.name}": ${(e as Error).message}`);
    }
  }

  private later(sec: number, fn: () => void, untracked = false) {
    if (sec <= 0) return fn();
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, sec * 1000);
    if (!untracked) this.timers.add(t);
  }

  /** Fire cue at index i, honouring pre-wait, then follow its auto-follow chain. */
  go(flat: Cue[], i: number) {
    this.unlock();
    const cue = flat[i];
    if (!cue) return;
    const run = async () => {
      this.pending.delete(cue.id);
      await this.execute(cue);
      const next = flat[i + 1];
      if (!next || cue.follow === "manual") return;
      const delay = cue.follow === "withStart" ? cue.postWait : this.durationOf(cue) + cue.postWait;
      if (!isFinite(delay)) return;
      this.later(delay, () => this.go(flat, i + 1));
    };
    if (cue.preWait > 0) {
      this.pending.set(cue.id, { cueId: cue.id, name: cue.name, type: cue.type, start: performance.now(), dur: cue.preWait });
      this.later(cue.preWait, run);
    } else void run();
  }

  panic(fadeSec: number) {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.pending.clear();
    this.waits.clear();
    for (const p of [...this.players.values()]) {
      if (fadeSec > 0 && !p.paused) this.fade(p, 0, fadeSec, true);
      else this.removePlayer(p.cue.id);
    }
  }

  stopCue(id: string) {
    this.removePlayer(id);
  }

  snapshot(): ActiveRow[] {
    const rows: ActiveRow[] = [];
    const now = performance.now();
    this.pending.forEach((p, k) =>
      rows.push({ key: "pre" + k, cueId: p.cueId, name: p.name, type: p.type, state: "pre", elapsed: (now - p.start) / 1000, duration: p.dur }),
    );
    this.players.forEach((p) => {
      let el = p.paused ? p.offset : p.offset + p.ctx.currentTime - p.startedCtx;
      if (p.cue.loop) el %= p.buffer.duration;
      rows.push({ key: p.cue.id, cueId: p.cue.id, name: p.cue.name, type: "audio", state: p.paused ? "paused" : "run", elapsed: el, duration: p.buffer.duration });
    });
    this.waits.forEach((w, k) =>
      rows.push({ key: "w" + k, cueId: k, name: w.name, type: "wait", state: "run", elapsed: (now - w.start) / 1000, duration: w.dur }),
    );
    return rows;
  }
}

export async function listAudioOutputs(requestLabels: boolean) {
  if (requestLabels) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
    } catch {}
  }
  const devs = await navigator.mediaDevices.enumerateDevices();
  return devs.filter((d) => d.kind === "audiooutput").map((d) => ({ id: d.deviceId === "default" ? "" : d.deviceId, label: d.label || "Ukendt udgang" }));
}
