export type MidiLogRow = { id: number; t: number; dir: "in" | "out"; port: string; bytes: number[] };

const KIND: Record<number, string> = { 0x80: "Note Off", 0x90: "Note On", 0xa0: "Poly AT", 0xb0: "CC", 0xc0: "Prog Ch", 0xd0: "Chan AT", 0xe0: "Pitch Bend" };
const SYS: Record<number, string> = { 0xfa: "Start", 0xfb: "Continue", 0xfc: "Stop", 0xf8: "Clock" };

export function describeMidi(b: number[]): string {
  const s = b[0] ?? 0;
  if (SYS[s]) return SYS[s]!;
  const k = KIND[s & 0xf0];
  if (!k) return "SysEx/andet";
  const ch = (s & 0x0f) + 1;
  if ((s & 0xf0) === 0xe0) return `${k} ch${ch} ${((b[2] ?? 0) << 7) | (b[1] ?? 0)}`;
  return `${k} ch${ch} ${b[1] ?? ""}${b.length > 2 ? " · " + b[2] : ""}`;
}

export function MidiMonitor(props: { rows: MidiLogRow[]; paused: boolean; setPaused: (b: boolean) => void; onClear: () => void; ins: string[]; outs: string[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border p-2 text-xs">
        <button onClick={() => props.setPaused(!props.paused)} className={`rounded px-2 py-1 font-semibold ${props.paused ? "bg-standby text-background" : "bg-secondary"}`}>{props.paused ? "▶ Fortsæt" : "❚❚ Frys"}</button>
        <button onClick={props.onClear} className="rounded bg-secondary px-2 py-1 font-semibold">Ryd</button>
        <span className="ml-auto truncate text-muted-foreground">Ind: {props.ins.join(", ") || "ingen"} · Ud: {props.outs.join(", ") || "ingen"}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto font-mono text-xs">
        {!props.rows.length && <div className="p-4 text-center text-muted-foreground">Ingen MIDI endnu – tryk på en pedal eller send et cue.</div>}
        {props.rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[70px_34px_1fr_1.4fr_auto] gap-2 border-b border-border px-2 py-0.5">
            <span className="text-muted-foreground">{new Date(r.t).toLocaleTimeString("da-DK")}</span>
            <span className={r.dir === "in" ? "font-bold text-standby" : "font-bold text-go"}>{r.dir === "in" ? "IND" : "UD"}</span>
            <span className="truncate">{r.port}</span>
            <span>{describeMidi(r.bytes)}</span>
            <span className="text-muted-foreground">{r.bytes.map((x) => x.toString(16).padStart(2, "0").toUpperCase()).join(" ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
