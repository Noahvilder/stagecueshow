import { useEffect, useRef, useState } from "react";
import { beatTimes, clickLength, type ClickSettings, type Meter } from "@/lib/show/clicktrack";
import type { ClickInfo } from "@/lib/show/types";

/** Live visual metronome for the drummer, synced to the pult's GO. */
export function ClickHud({ click, goId, goAgoMs }: { click: ClickInfo; goId: number; goAgoMs: number }) {
  const startRef = useRef(0);
  const [t, setT] = useState(0);
  // Only re-anchor on a new GO, so later snapshots don't make it jump.
  useEffect(() => { startRef.current = performance.now() - goAgoMs; }, [goId]); // eslint-disable-line react-hooks/exhaustive-deps
  const s: ClickSettings = { ...click, meter: click.meter as Meter, sound: "wood", accent: true, accentGain: 0, volume: 0 };
  const beats = beatTimes(s);
  const end = clickLength(s);
  useEffect(() => {
    let raf = 0;
    const tick = () => { setT((performance.now() - startRef.current) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (t > end + 0.5) return null;
  let i = 0;
  while (i + 1 < beats.length && beats[i + 1]!.time <= t) i++;
  const b = beats[i]!;
  const nextT = beats[i + 1]?.time ?? end;
  const bpm = Math.round((60 / Math.max(0.001, nextT - b.time)) * (4 / Number(click.meter.split("/")[1])));
  const flash = t - b.time < 0.12;
  const per = Number(click.meter.split("/")[0]);
  const ramping = click.startBpm !== click.endBpm && b.bar <= click.bars;
  return (
    <div className="mb-4 flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div className="font-mono text-[clamp(4rem,18vw,12rem)] font-black leading-none tabular-nums">{bpm}</div>
      <div className="text-xl font-bold text-muted-foreground">{ramping ? `BPM · RAMPE ${click.startBpm} → ${click.endBpm}` : `BPM · ${click.meter}`} · Takt {b.bar}</div>
      <div className="flex flex-wrap justify-center gap-4">
        {Array.from({ length: per }, (_, k) => (
          <span key={k} className={`h-12 w-12 rounded-full border-4 ${k === 0 ? "border-destructive" : "border-go"} ${k === b.beat - 1 && flash ? (k === 0 ? "bg-destructive" : "bg-go") : ""}`} />
        ))}
      </div>
    </div>
  );
}
