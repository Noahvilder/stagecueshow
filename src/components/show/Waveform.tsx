import { useEffect, useRef, useState } from "react";
import { trimSpan } from "@/lib/show/logic";

/** Waveform with draggable start/end trim markers. */
export function Waveform(props: {
  load: () => Promise<AudioBuffer>;
  fileKey: string;
  startTime: number;
  endTime: number;
  onChange: (p: { startTime?: number; endTime?: number }) => void;
}) {
  const [buf, setBuf] = useState<AudioBuffer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const peaks = useRef<Float32Array | null>(null);

  useEffect(() => {
    let dead = false;
    setBuf(null); setErr(null);
    props.load().then((b) => {
      if (dead) return;
      const N = 600, d = b.getChannelData(0), step = Math.max(1, Math.floor(d.length / N));
      const p = new Float32Array(N);
      for (let i = 0; i < N; i++) { let m = 0; for (let j = i * step; j < (i + 1) * step && j < d.length; j += 4) m = Math.max(m, Math.abs(d[j]!)); p[i] = m; }
      peaks.current = p;
      setBuf(b);
    }).catch((e) => !dead && setErr((e as Error).message));
    return () => { dead = true; };
  }, [props.fileKey]);

  const dur = buf?.duration ?? 0;
  const span = trimSpan(dur, props.startTime, props.endTime);

  useEffect(() => {
    const c = cv.current, p = peaks.current;
    if (!c || !p || !dur) return;
    const w = (c.width = c.clientWidth * devicePixelRatio), h = (c.height = c.clientHeight * devicePixelRatio);
    const g = c.getContext("2d")!;
    const css = getComputedStyle(c);
    const on = css.getPropertyValue("--go").trim() || "lime", off = css.getPropertyValue("--muted-foreground").trim() || "gray", mk = css.getPropertyValue("--standby").trim() || "orange";
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < p.length; i++) {
      const t = (i / p.length) * dur, x = (i / p.length) * w, bh = Math.max(1, p[i]! * h * 0.95);
      g.fillStyle = t >= span.start && t <= span.end ? on : off;
      g.globalAlpha = t >= span.start && t <= span.end ? 1 : 0.35;
      g.fillRect(x, (h - bh) / 2, Math.max(1, w / p.length - 0.5), bh);
    }
    g.globalAlpha = 1; g.fillStyle = mk;
    for (const t of [span.start, span.end]) g.fillRect((t / dur) * w - devicePixelRatio, 0, 2 * devicePixelRatio, h);
  }, [buf, span.start, span.end, dur]);

  const drag = (e: React.PointerEvent) => {
    if (!dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    const tAt = (x: number) => Math.max(0, Math.min(dur, ((x - r.left) / r.width) * dur));
    const t0 = tAt(e.clientX);
    const which = Math.abs(t0 - span.start) < Math.abs(t0 - span.end) ? "start" : "end";
    const apply = (t: number) => {
      const v = Math.round(t * 100) / 100;
      if (which === "start") props.onChange({ startTime: Math.min(v, span.end - 0.05) });
      else props.onChange({ endTime: v >= dur - 0.01 ? 0 : Math.max(v, span.start + 0.05) });
    };
    apply(t0);
    const mv = (ev: PointerEvent) => apply(tAt(ev.clientX));
    const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); };
    addEventListener("pointermove", mv); addEventListener("pointerup", up);
  };

  if (err) return <div className="text-xs text-destructive">{err}</div>;
  if (!buf) return <div className="h-20 animate-pulse rounded bg-muted" />;
  return (
    <div className="flex flex-col gap-1">
      <canvas ref={cv} onPointerDown={drag} className="h-20 w-full cursor-ew-resize touch-none rounded bg-muted" aria-label="Waveform – træk markørerne for at trimme" />
      <div className="flex justify-between font-mono text-xs text-muted-foreground">
        <span>Start {span.start.toFixed(2)}s</span><span>Længde {span.len.toFixed(2)}s</span><span>Slut {span.end.toFixed(2)}s / {dur.toFixed(2)}s</span>
      </div>
    </div>
  );
}
