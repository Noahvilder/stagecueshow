import { sendOsc } from "./osc";
import { getAudio } from "./audioStore";
import { dbToGain, deepCues, groupDuration, midiBytes, trimSpan } from "./logic";
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
  start: number;
  end: number;
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
  onMidiIn: (bytes: number[]) => void = () => {};
  onMidiLog: (dir: "in" | "out", port: string, bytes: number[]) => void = () => {};
  onMidiPorts: (outs: string[], ins: string[]) => void = () => {};
  /** Maps numbered outputs ("#1") to real hardware for this PC. */
  resolveAudio: (id: string) => string = (id) => id;
  resolveMidi: (port: string) => string = (p) => p;
  private masters = new Map<AudioContext, GainNode>();
  private muted = false;
  private attachInputs() {
    if (!this.midi) return;
    this.midi.inputs.forEach((inp) => {
      inp.onmidimessage = (e) => {
        if (!e.data) return;
        const b = Array.from(e.data);
        if (b[0] === 0xf8 || b[0] === 0xfe) return; // skip clock/active sensing noise
        this.onMidiLog("in", inp.name ?? inp.id, b);
        this.onMidiIn(b);
      };
    });
  }
  midiInputs(): string[] {
    return this.midi ? Array.from(this.midi.inputs.values()).filter((i) => i.state !== "disconnected").map((i) => i.name ?? i.id) : [];
  }
  setMute(m: boolean) {
    this.muted = m;
    this.masters.forEach((g, c) => g.gain.setTargetAtTime(m ? 0 : 1, c.currentTime, 0.02));
  }
  isMuted() { return this.muted; }
  private master(c: AudioContext) {
    let g = this.masters.get(c);
    if (!g) {
      const n = Math.min(32, c.destination.maxChannelCount || 2);
      if (n > 2) { c.destination.channelCount = n; c.destination.channelCountMode = "explicit"; c.destination.channelInterpretation = "discrete"; }
      g = c.createGain(); g.channelCount = Math.max(2, n); g.channelCountMode = "explicit"; g.channelInterpretation = "discrete";
      g.gain.value = this.muted ? 0 : 1; g.connect(c.destination); this.masters.set(c, g);
    }
    return g;
  }
  /** Number of hardware channels on an output (ASIO/multichannel interfaces report up to 32). */
  async channelCount(outputId: string): Promise<number> {
    const c = await this.ctx(outputId);
    return Math.max(2, Math.min(32, c.destination.maxChannelCount || 2));
  }
  /** Send a stereo node to channels ch/ch+1 (or ch only if mono) of the output. */
  private route(c: AudioContext, node: AudioNode, ch: number, mono: boolean) {
    const master = this.master(c);
    const n = master.channelCount;
    if (n <= 2 && ch <= 1 && !mono) { node.connect(master); return; }
    const first = Math.max(0, Math.min(n - 1, ch - 1));
    const split = c.createChannelSplitter(2);
    const merge = c.createChannelMerger(n);
    node.connect(split);
    if (mono) { split.connect(merge, 0, first); split.connect(merge, 1, first); }
    else { split.connect(merge, 0, first); split.connect(merge, 1, Math.min(n - 1, first + 1)); }
    merge.connect(master);
  }
  /** Decoded audio for waveform display. */
  async decoded(fileId: string, outputId = ""): Promise<AudioBuffer> {
    return this.buffer(fileId, await this.ctx(outputId));
  }

  async initMidi(): Promise<string[]> {
    if (!navigator.requestMIDIAccess) throw new Error("Web MIDI understøttes ikke i denne browser (brug Chrome/Edge)");
    this.midi = await navigator.requestMIDIAccess({ sysex: false });
    this.attachInputs();
    this.midi.onstatechange = () => { this.attachInputs(); this.onMidiPorts(this.midiOutputs(), this.midiInputs()); };
    return this.midiOutputs();
  }
  midiOutputs(): string[] {
    return this.midi ? Array.from(this.midi.outputs.values()).filter((o) => o.state !== "disconnected").map((o) => o.name ?? o.id) : [];
  }
  sendMidi(m: MidiMsg) {
    const port = this.resolveMidi(m.port);
    const out = this.midi && Array.from(this.midi.outputs.values()).find((o) => (o.name ?? o.id) === port);
    if (!out) return this.onError(`MIDI-port ikke fundet: ${m.port !== port ? `${m.port} → ` : ""}${port || "(ingen valgt)"}`);
    const b = midiBytes(m);
    out.send(b);
    this.onMidiLog("out", port, b);
  }

  private async ctx(rawId: string): Promise<AudioContext> {
    const outputId = this.resolveAudio(rawId);
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
    for (const c of deepCues(cues)) if (c.type === "audio" && c.fileId) await this.buffer(c.fileId, await this.ctx(c.outputId)).catch(() => {});
  }

  private startSource(p: Player) {
    const src = p.ctx.createBufferSource();
    src.buffer = p.buffer;
    src.loop = p.cue.loop;
    src.connect(p.gain);
    const len = p.end - p.start;
    src.onended = () => {
      if (p.source === src && !p.paused) this.removePlayer(p.cue.id);
    };
    p.source = src;
    p.startedCtx = p.ctx.currentTime;
    if (p.cue.loop) {
      src.loopStart = p.start;
      src.loopEnd = p.end;
      src.start(0, p.start + (p.offset % len));
    } else src.start(0, p.start + p.offset, Math.max(0, len - p.offset));
  }

  private async playAudio(cue: AudioCue) {
    if (!cue.fileId) return this.onError(`"${cue.name}": ingen lydfil valgt`);
    const ctx = await this.ctx(cue.outputId);
    const buffer = await this.buffer(cue.fileId, ctx);
    this.removePlayer(cue.id);
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-1, Math.min(1, cue.pan));
    gain.connect(pan);
    this.route(ctx, pan, cue.channel ?? 1, !!cue.mono);
    const span = trimSpan(buffer.duration, cue.startTime, cue.endTime);
    const target = dbToGain(cue.volume);
    const now = ctx.currentTime;
    if (cue.fadeIn > 0) {
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(target, now + cue.fadeIn);
    } else gain.gain.setValueAtTime(target, now);
    if (!cue.loop && cue.fadeOut > 0 && span.len > cue.fadeOut) {
      const t = now + span.len - cue.fadeOut;
      gain.gain.setValueAtTime(target, t);
      gain.gain.linearRampToValueAtTime(0, now + span.len);
    }
    const p: Player = { cue, ctx, buffer, gain, pan, source: null, offset: 0, startedCtx: now, paused: false, start: span.start, end: span.end };
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
        return cue.loop ? Infinity : b ? trimSpan(b.duration, cue.startTime, cue.endTime).len : 0;
      }
      case "wait":
      case "fade":
      case "stop":
        return cue.duration;
      case "group":
        return groupDuration(cue.children, (c) => this.durationOf(c));
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
        case "osc": {
          const err = await sendOsc(cue);
          if (err) this.onError(err);
          break;
        }
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
        case "group":
          cue.children.forEach((ch) => {
            if (ch.preWait <= 0) return void this.execute(ch);
            const key = `${cue.id}>${ch.id}`;
            this.pending.set(key, { cueId: ch.id, name: ch.name, type: ch.type, start: performance.now(), dur: ch.preWait });
            this.later(ch.preWait, () => { if (!this.pending.delete(key)) return; void this.execute(ch); });
          });
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
    this.pending.forEach((p, k) => { if (p.cueId === id) this.pending.delete(k); });
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
      const len = p.end - p.start;
      if (p.cue.loop) el %= len;
      rows.push({ key: p.cue.id, cueId: p.cue.id, name: p.cue.name, type: "audio", state: p.paused ? "paused" : "run", elapsed: el, duration: len });
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
