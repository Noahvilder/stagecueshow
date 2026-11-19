import { useEffect, useState } from "react";

export type MidiLogRow = { id: number; t: number; dir: "in" | "out"; port: string; bytes: number[] };

const KIND: Record<number, string> = { 0x80: "Note Off", 0x90: "Note On", 0xa0: "Poly AT", 0xb0: "CC", 0xc0: "Prog Ch", 0xd0: "Chan AT", 0xe0: "Pitch Bend" };
const SYS: Record<number, string> = { 0xfa: "Start", 0xfb: "Continue", 0xfc: "Stop", 0xf8: "Clock" };
/** How long (ms) a signal counts as "active" and is shown green. */
export const ACTIVE_MS = 1500;

export function describeMidi(b: number[]): string {
  const s = b[0] ?? 0;
  if (SYS[s]) return SYS[s]!;
  const k = KIND[s & 0xf0];
  if (!k) return "SysEx/andet";
  const ch = (s & 0x0f) + 1;
  if ((s & 0xf0) === 0xe0) return `${k} ch${ch} ${((b[2] ?? 0) << 7) | (b[1] ?? 0)}`;
  return `${k} ch${ch} ${b[1] ?? ""}${b.length > 2 ? " · " + b[2] : ""}`;
}

export const isActive = (row: { t: number }, now: number) => now - row.t < ACTIVE_MS;

export function MidiMonitor(props: { rows: MidiLogRow[]; paused: boolean; setPaused: (b: boolean) => void; onClear: () => void; ins: string[]; outs: string[] }) {
  const [now, setNow] = useState(() => Date.now());
  const [src, setSrc] = useState("");
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i); }, []);
  const ports = [...new Set(props.rows.map((r) => r.port))];
  const rows = src ? props.rows.filter((r) => r.port === src) : props.rows;
  const live = rows.filter((r) => isActive(r, now));
  const hist = rows.filter((r) => !isActive(r, now));
  const Row = ({ r, on }: { r: MidiLogRow; on: boolean }) => (
    <div className={`grid grid-cols-[70px_34px_1.4fr_1fr_auto] gap-2 border-b border-border px-2 py-0.5 ${on ? "bg-go/25 font-bold text-go" : "text-muted-foreground"}`}>
      <span>{new Date(r.t).toLocaleTimeString("da-DK")}</span>
      <span>{r.dir === "in" ? "IND" : "UD"}</span>
      <span className={on ? "" : "text-foreground"}>{describeMidi(r.bytes)}</span>
      <span className="truncate" title="Kilde">{r.port}</span>
      <span title="Datastørrelse">{r.bytes.length} B · {r.bytes.map((x) => x.toString(16).padStart(2, "0").toUpperCase()).join(" ")}</span>
    </div>
  );
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border p-2 text-xs">
        <button onClick={() => props.setPaused(!props.paused)} className={`rounded px-2 py-1 font-semibold ${props.paused ? "bg-standby text-background" : "bg-secondary"}`}>{props.paused ? "▶ Fortsæt" : "❚❚ Frys"}</button>
        <button onClick={props.onClear} className="rounded bg-secondary px-2 py-1 font-semibold">Ryd</button>
        <select value={src} onChange={(e) => setSrc(e.target.value)} className="rounded border border-border bg-background px-1 py-1" title="Vis kun én kilde">
          <option value="">Alle kilder</option>{ports.map((p) => <option key={p}>{p}</option>)}
        </select>
        <span className="ml-auto truncate text-muted-foreground">Ind: {props.ins.join(", ") || "ingen"} · Ud: {props.outs.join(", ") || "ingen"}</span>
      </div>
      <div className="grid grid-cols-[70px_34px_1.4fr_1fr_auto] gap-2 border-b border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground"><span>Tid</span><span>Ret</span><span>Note/kommando</span><span>Kilde</span><span>Data</span></div>
      <div className="min-h-[2rem] border-b-2 border-go/40 font-mono text-xs">
        {live.length ? live.map((r) => <Row key={r.id} r={r} on />) : <div className="px-2 py-1 text-muted-foreground">● Ingen aktive signaler</div>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto font-mono text-xs">
        {!props.rows.length && <div className="p-4 text-center text-muted-foreground">Ingen MIDI endnu – tryk på en controller eller send et cue.</div>}
        {hist.map((r) => <Row key={r.id} r={r} on={false} />)}
      </div>
    </div>
  );
}
