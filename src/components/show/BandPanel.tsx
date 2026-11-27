import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { concertBeat, concertClickMap, concertMeter, concertTempo } from "@/lib/show/workspace";
import type { ClickInfo, Song } from "@/lib/show/types";

export function BandPanel({ song, nextSong, elapsed, running, click, autoStop, onAutoStop, onSong, previous, next, locked }: {
  song: Song | undefined; nextSong: Song | undefined; elapsed: number; running: boolean;
  click: ClickInfo | undefined; autoStop: boolean; onAutoStop: (value: boolean) => void;
  onSong: (direction: -1 | 1) => void; previous: boolean; next: boolean; locked: boolean;
}) {
  const map = useMemo(() => click ? concertClickMap(click) : null, [click]);
  const meter = concertMeter(click?.meter ?? song?.meter);
  let bpm = concertTempo(song?.bpm);
  let pulse = concertBeat(elapsed, bpm, meter);
  let playing = running;
  if (map) {
    let lo = 0, hi = map.beats.length - 1;
    while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if ((map.beats[mid]?.time ?? Infinity) <= elapsed) lo = mid; else hi = mid - 1; }
    const beat = map.beats[lo];
    if (beat) {
      const end = map.beats[lo + 1]?.time ?? map.end;
      bpm = Math.round(60 / Math.max(0.001, end - beat.time) * (4 / Number(meter.split("/")[1])));
      pulse = { beat: beat.beat, bar: beat.bar, flash: elapsed >= beat.time && elapsed - beat.time < 0.12 };
    }
    playing = running && elapsed >= 0 && elapsed < map.end;
  }
  return <div className="flex flex-col gap-5 p-4">
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
      <div className="min-w-0"><div className="text-xs font-bold uppercase text-muted-foreground">{playing ? "Spiller" : "Standby"}</div><h2 className="break-words text-2xl font-bold">{song?.name ?? "Ingen sang"}</h2></div>
      <div className="flex shrink-0 gap-1">
        <Button variant="outline" size="icon" disabled={!previous} onClick={() => onSong(-1)} aria-label="Forrige sang" title="Forrige sang"><ChevronLeft /></Button>
        <Button variant="outline" size="icon" disabled={!next} onClick={() => onSong(1)} aria-label="Næste sang" title="Næste sang"><ChevronRight /></Button>
      </div>
    </div>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="font-mono text-7xl font-black leading-none tabular-nums">{bpm}</div><div className="mt-2 text-sm font-semibold text-muted-foreground">BPM · {meter}{click && click.startBpm !== click.endBpm ? ` · ${click.startBpm} → ${click.endBpm}` : ""}</div></div>
      <div className="font-mono text-xl text-muted-foreground">Takt {playing ? pulse.bar : "—"}</div>
    </div>
    <div className="grid grid-cols-6 gap-2" aria-label={playing ? `Slag ${pulse.beat}` : "Tempo i standby"}>
      {Array.from({ length: Number(meter.split("/")[0]) }, (_, i) => <span key={i} className={`flex aspect-square items-center justify-center rounded border-2 text-xl font-bold motion-reduce:transition-none ${playing && pulse.flash && pulse.beat === i + 1 ? i === 0 ? "border-standby bg-standby text-background" : "border-go bg-go text-go-foreground" : "border-border bg-secondary text-muted-foreground"}`}>{i + 1}</span>)}
    </div>
    <div className="flex items-center justify-between gap-3 border-y border-border py-3"><label htmlFor="concert-auto-stop" className="text-sm font-semibold">Auto-stop mellem sange</label><Switch id="concert-auto-stop" checked={autoStop} onCheckedChange={onAutoStop} disabled={locked || running} /></div>
    <div><div className="text-xs font-bold uppercase text-muted-foreground">Næste sang</div><div className="mt-1 break-words text-lg font-semibold">{nextSong?.name ?? "Slut på sætliste"}</div></div>
  </div>;
}