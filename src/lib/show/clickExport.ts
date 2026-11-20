import { beatTimes, beatsPerBar, type ClickSettings, type Meter } from "./clicktrack";
import type { ClickInfo } from "./types";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const safeName = (n: string) => n.replace(/[\\/:*?"<>|→]+/g, "-").trim() || "click";

/** Records the click as a video (BPM + beat circles + the audio). Runs in real time. */
export async function renderClickVideo(audio: Blob, click: ClickInfo, onProgress?: (p: number) => void): Promise<{ blob: Blob; ext: string }> {
  const s = { ...click, sound: "wood", accent: true, accentGain: 0.5, volume: 1 } as ClickSettings;
  const beats = beatTimes(s);
  const per = beatsPerBar(click.meter as Meter);
  const ctx = new AudioContext();
  const buf = await ctx.decodeAudioData(await audio.arrayBuffer());
  const dest = ctx.createMediaStreamDestination();
  const src = ctx.createBufferSource();
  src.buffer = buf; src.connect(dest);
  const canvas = document.createElement("canvas");
  canvas.width = 1280; canvas.height = 720;
  const g = canvas.getContext("2d")!;
  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const types = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];
  const mime = types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));
  const ramp = click.startBpm !== click.endBpm;
  const draw = (t: number) => {
    let i = 0;
    while (i + 1 < beats.length && beats[i + 1]!.time <= t) i++;
    const b = beats[i]!, nx = beats[i + 1];
    const bpm = Math.round(nx ? 60 / (nx.time - b.time) / (click.meter.endsWith("/8") ? 2 : 1) : click.endBpm);
    const inRamp = ramp && b.bar <= click.bars;
    g.fillStyle = "#0b0d12"; g.fillRect(0, 0, 1280, 720);
    g.fillStyle = "#f5f5f5"; g.textAlign = "center";
    g.font = "bold 260px sans-serif"; g.fillText(String(bpm), 640, 360);
    g.font = "36px sans-serif"; g.fillStyle = "#9ca3af";
    g.fillText(ramp ? (inRamp ? `BPM · RAMPE ${click.startBpm} → ${click.endBpm}` : `BPM · HOLD ${click.endBpm}`) : `BPM · ${click.meter}`, 640, 430);
    g.fillText(`Takt ${b.bar}`, 640, 680);
    const gap = Math.min(140, 1100 / per), x0 = 640 - ((per - 1) * gap) / 2;
    const flash = t >= b.time && t - b.time < 0.15;
    for (let k = 0; k < per; k++) {
      g.beginPath(); g.arc(x0 + k * gap, 540, Math.min(45, gap / 3), 0, Math.PI * 2);
      const on = flash && b.beat - 1 === k;
      g.fillStyle = on ? (k === 0 ? "#ef4444" : "#22c55e") : "#1f2937"; g.fill();
    }
  };
  draw(0);
  rec.start(500);
  const t0 = ctx.currentTime + 0.1;
  src.start(t0);
  await new Promise<void>((res) => {
    const tick = () => {
      const t = ctx.currentTime - t0;
      draw(Math.max(0, t));
      onProgress?.(Math.min(1, t / buf.duration));
      if (t >= buf.duration + 0.2) return res();
      setTimeout(tick, 1000 / 30);
    };
    tick();
  });
  rec.stop(); await done; await ctx.close();
  const type = rec.mimeType || mime || "video/webm";
  return { blob: new Blob(chunks, { type }), ext: type.includes("mp4") ? "mp4" : "webm" };
}
