import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Engine, listAudioOutputs, type ActiveRow } from "@/lib/show/engine";
import { putAudio } from "@/lib/show/audioStore";
import {
  DEFAULT_TYPE_COLORS, TYPE_LABEL, cueColor, emptyShow, flatten, fmt, moveCue, moveSong,
  newCue, newMidiMsg, nextStandbyIndex, parseShow, uid,
} from "@/lib/show/logic";
import type { Cue, CueType, MidiMsg, Show } from "@/lib/show/types";
import { FloatingWindow, type WinState } from "./FloatingWindow";
import { PEDAL_LABEL, matchPedal, midiInLabel, parseMidiIn, type MidiIn, type PedalAction, type PedalMap } from "@/lib/show/pedal";

type WinKey = "stage" | "transport" | "list" | "inspector" | "pedal";
const WIN_KEY = "stagecue.windows.v1";
const PEDAL_KEY = "stagecue.pedals.v1";
const defaultWins = (): Record<WinKey, WinState> => ({
  stage: { x: 12, y: 12, w: 620, h: 430, z: 5, open: true, min: false },
  transport: { x: 12, y: 454, w: 360, h: 470, z: 4, open: true, min: false },
  list: { x: 644, y: 12, w: 620, h: 700, z: 3, open: true, min: false },
  inspector: { x: 1276, y: 12, w: 400, h: 700, z: 2, open: true, min: false },
  pedal: { x: 384, y: 454, w: 360, h: 330, z: 1, open: false, min: false },
});
const WIN_TITLES: Record<WinKey, string> = { stage: "Scene", transport: "Transport", list: "Setliste", inspector: "Inspector", pedal: "Fodpedal" };

const STORAGE_KEY = "stagecue.show.v1";
const TYPES: CueType[] = ["audio", "midi", "fade", "stop", "pause", "wait", "memo"];

type Output = { id: string; label: string };

export function ShowControl() {
  const engineRef = useRef<Engine | null>(null);
  const [show, setShow] = useState<Show>(emptyShow);
  const [loaded, setLoaded] = useState(false);
  const [standbyId, setStandbyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [midiPorts, setMidiPorts] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<Output[]>([{ id: "", label: "Standard udgang" }]);
  const [settings, setSettings] = useState(false);
  const [clock, setClock] = useState("");
  const [lastGo, setLastGo] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [wins, setWins] = useState(defaultWins);
  const [noteSize, setNoteSize] = useState<0 | 1 | 2>(1);
  const [pedals, setPedals] = useState<PedalMap>({});
  const [learning, setLearning] = useState<PedalAction | null>(null);
  const [lastMidi, setLastMidi] = useState<MidiIn | null>(null);
  const setWin = (k: WinKey, p: Partial<WinState>) => setWins((w) => ({ ...w, [k]: { ...w[k], ...p } }));
  const focusWin = (k: WinKey) =>
    setWins((w) => {
      const top = Math.max(...Object.values(w).map((x) => x.z));
      return w[k].z === top ? w : { ...w, [k]: { ...w[k], z: top + 1 } };
    });
  useEffect(() => {
    try {
      const w = localStorage.getItem(WIN_KEY);
      if (w) setWins({ ...defaultWins(), ...JSON.parse(w) });
      const p = localStorage.getItem(PEDAL_KEY);
      if (p) setPedals(JSON.parse(p));
      const n = localStorage.getItem("stagecue.notesize");
      if (n) setNoteSize(Number(n) as 0 | 1 | 2);
    } catch {}
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(WIN_KEY, JSON.stringify(wins)); }, [wins, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem(PEDAL_KEY, JSON.stringify(pedals)); }, [pedals, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem("stagecue.notesize", String(noteSize)); }, [noteSize, loaded]);

  const engine = () => {
    if (!engineRef.current) {
      engineRef.current = new Engine();
      engineRef.current.onError = (m) => setError(m);
    }
    return engineRef.current;
  };

  const flat = useMemo(() => flatten(show), [show]);
  const standbyIdx = flat.findIndex((c) => c.id === standbyId);
  const standby = standbyIdx >= 0 ? flat[standbyIdx] : null;
  const selected = flat.find((c) => c.id === selectedId) ?? null;

  // load + autosave
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setShow(parseShow(raw));
    } catch {}
    setLoaded(true);
    engine()
      .initMidi()
      .then(setMidiPorts)
      .catch((e) => setError(e.message));
    listAudioOutputs(false).then((o) => setOutputs(dedupe(o))).catch(() => {});
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(show));
  }, [show, loaded]);
  useEffect(() => {
    if (!standby && flat.length) setStandbyId(flat[0]!.id);
  }, [flat, standby]);

  // ticker
  useEffect(() => {
    const t = setInterval(() => {
      setActive(engine().snapshot());
      setClock(new Date().toLocaleTimeString("da-DK"));
      setNow(performance.now());
    }, 100);
    return () => clearInterval(t);
  }, []);

  const go = useCallback(() => {
    if (standbyIdx < 0) return;
    engine().go(flat, standbyIdx);
    setLastGo(performance.now());
    const n = nextStandbyIndex(flat, standbyIdx);
    setStandbyId(n >= 0 ? flat[n]!.id : null);
  }, [flat, standbyIdx]);

  const panic = useCallback(() => engine().panic(show.panicFade), [show.panicFade]);
  const hardStop = () => engine().panic(0);

  const step = useCallback(
    (d: number) => {
      if (!flat.length) return;
      const i = Math.max(0, Math.min(flat.length - 1, (standbyIdx < 0 ? flat.length : standbyIdx) + d));
      setStandbyId(flat[i]!.id);
    },
    [flat, standbyIdx],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) go();
      } else if (e.code === "Escape") {
        e.preventDefault();
        panic();
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        step(1);
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, panic, step]);

  const midiRef = useRef<(b: number[]) => void>(() => {});
  midiRef.current = (b) => {
    const ev = parseMidiIn(b);
    if (!ev) return;
    setLastMidi(ev);
    if (learning) {
      setPedals((m) => ({ ...m, [learning]: ev }));
      setLearning(null);
      return;
    }
    const a = matchPedal(pedals, ev);
    if (a === "go") go();
    else if (a === "panic") panic();
    else if (a === "next") step(1);
    else if (a === "prev") step(-1);
  };
  useEffect(() => {
    engine().onMidiIn = (b) => midiRef.current(b);
  }, []);

  // mutations
  const updateCue = (id: string, patch: Partial<Cue>) =>
    setShow((s) => ({
      ...s,
      songs: s.songs.map((sg) => ({ ...sg, cues: sg.cues.map((c) => (c.id === id ? ({ ...c, ...patch } as Cue) : c)) })),
    }));
  const addCue = (type: CueType) => {
    const c = newCue(type);
    setShow((s) => {
      const songs = [...s.songs];
      let si = songs.findIndex((sg) => sg.cues.some((x) => x.id === selectedId));
      if (si < 0) si = songs.length - 1;
      if (si < 0) return { ...s, songs: [{ id: uid(), name: "Sang 1", cues: [c] }] };
      const cues = [...songs[si]!.cues];
      const ci = cues.findIndex((x) => x.id === selectedId);
      cues.splice(ci < 0 ? cues.length : ci + 1, 0, c);
      songs[si] = { ...songs[si]!, cues };
      return { ...s, songs };
    });
    setSelectedId(c.id);
  };
  const deleteCue = (id: string) => {
    setShow((s) => ({ ...s, songs: s.songs.map((sg) => ({ ...sg, cues: sg.cues.filter((c) => c.id !== id) })) }));
    if (selectedId === id) setSelectedId(null);
  };
  const addSong = () => setShow((s) => ({ ...s, songs: [...s.songs, { id: uid(), name: `Sang ${s.songs.length + 1}`, cues: [] }] }));
  const renameSong = (id: string, name: string) => setShow((s) => ({ ...s, songs: s.songs.map((sg) => (sg.id === id ? { ...sg, name } : sg)) }));
  const deleteSong = (id: string) => {
    if (!confirm("Slet sang og alle dens cues?")) return;
    setShow((s) => ({ ...s, songs: s.songs.filter((sg) => sg.id !== id) }));
  };

  // file io
  const fileRef = useRef<HTMLInputElement>(null);
  const exportShow = () => {
    const blob = new Blob([JSON.stringify(show, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${show.name.replace(/[^\wæøåÆØÅ -]/g, "") || "show"}.stagecue.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importShow = async (f: File) => {
    try {
      const s = parseShow(await f.text());
      engine().panic(0);
      setShow(s);
      setStandbyId(null);
      setSelectedId(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // drag & drop
  const drag = useRef<{ kind: "cue" | "song"; id: string } | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const onDropCue = (songId: string, beforeId: string | null) => {
    const d = drag.current;
    setDropKey(null);
    if (!d) return;
    if (d.kind === "cue") setShow((s) => moveCue(s, d.id, songId, beforeId));
    else setShow((s) => moveSong(s, d.id, songId));
    drag.current = null;
  };

  const lastGoEl = lastGo ? (now - lastGo) / 1000 : null;
  const mainRun = active.filter((a) => a.state !== "pre" && a.duration && isFinite(a.duration)).sort((a, b) => b.duration! - b.elapsed - (a.duration! - a.elapsed))[0];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      {/* top bar */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-2">
        <span className="font-mono text-sm font-bold tracking-widest text-go">STAGECUE</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none focus:bg-input"
          value={show.name}
          onChange={(e) => setShow({ ...show, name: e.target.value })}
          aria-label="Show navn"
        />
        <span className="font-mono text-2xl tabular-nums">{clock}</span>
        <Btn onClick={() => fileRef.current?.click()}>Åbn</Btn>
        <Btn onClick={exportShow}>Gem</Btn>
        <Btn
          onClick={() => {
            if (confirm("Start et nyt tomt show?")) {
              engine().panic(0);
              setShow(emptyShow());
            }
          }}
        >
          Ny
        </Btn>
        <div className="flex gap-1 border-l border-border pl-3">
          {(Object.keys(WIN_TITLES) as WinKey[]).map((k) => (
            <button
              key={k}
              onClick={() => (wins[k].open ? setWin(k, { open: false }) : (setWin(k, { open: true, min: false }), focusWin(k)))}
              className={`rounded px-2 py-1 text-xs font-semibold ${wins[k].open ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {WIN_TITLES[k]}
            </button>
          ))}
          <button onClick={() => setWins(defaultWins())} className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary">Nulstil layout</button>
        </div>
        <Btn onClick={() => setSettings(true)}>Indstillinger</Btn>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && importShow(e.target.files[0])} />
      </header>

      {error && (
        <div className="flex items-center justify-between bg-destructive px-4 py-1 text-sm font-semibold text-destructive-foreground">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="px-2">✕</button>
        </div>
      )}

<div className="relative min-h-0 flex-1 overflow-hidden">
<FloatingWindow title={"Scene · Nu & Næste"} state={wins.stage} onChange={(p) => setWin("stage", p)} onFocus={() => focusWin("stage")} accent>
<StageView show={show} flat={flat} standby={standby ?? null} standbyIdx={standbyIdx} size={noteSize} setSize={setNoteSize} onNotes={(v) => standby && updateCue(standby.id, { notes: v })} />
</FloatingWindow>
<FloatingWindow title={"Transport"} state={wins.transport} onChange={(p) => setWin("transport", p)} onFocus={() => focusWin("transport")}>
<div className="flex flex-col gap-3 p-3">
          <button
            onClick={go}
            disabled={!standby}
            className="h-32 rounded-xl bg-go text-6xl font-black tracking-widest text-go-foreground shadow-[0_0_40px_-8px_var(--go)] transition active:scale-[0.98] disabled:opacity-30"
          >
            GO
          </button>
          <div className="text-center text-xs text-muted-foreground">Mellemrum = GO · ↑↓ = flyt standby · Esc = Panic</div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={panic} className="h-16 rounded-lg bg-destructive text-lg font-black text-destructive-foreground">
              PANIC
              <div className="text-xs font-normal">fade {show.panicFade}s</div>
            </button>
            <button onClick={hardStop} className="h-16 rounded-lg border-2 border-destructive text-lg font-black text-destructive">
              STOP ALT
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono">
            <TimeBox label="Siden GO" value={fmt(lastGoEl)} />
            <TimeBox label="Nedtælling" value={mainRun ? "-" + fmt(mainRun.duration! - mainRun.elapsed) : "--:--"} accent />
          </div>

          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Aktive ({active.length})</div>
            <div className="flex flex-col gap-1">
              {active.map((a) => (
                <ActiveBar key={a.key} row={a} color={cueColorById(show, a.cueId)} onStop={() => engine().stopCue(a.cueId)} />
              ))}
              {!active.length && <div className="text-sm text-muted-foreground">Intet kører</div>}
            </div>
          </div>
        </div>
</FloatingWindow>
<FloatingWindow title={"Setliste & Cues"} state={wins.list} onChange={(p) => setWin("list", p)} onFocus={() => focusWin("list")}>
<div className="flex h-full min-h-0 flex-col">
          <div className="flex flex-wrap gap-1 border-b border-border p-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => addCue(t)}
                className="rounded border-l-4 bg-secondary px-3 py-1.5 text-sm font-semibold hover:bg-accent"
                style={{ borderLeftColor: show.typeColors[t] || DEFAULT_TYPE_COLORS[t] }}
              >
                + {TYPE_LABEL[t]}
              </button>
            ))}
            <button onClick={addSong} className="ml-auto rounded bg-secondary px-3 py-1.5 text-sm font-semibold hover:bg-accent">
              + Sang
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {show.songs.map((song, si) => (
              <section key={song.id} className="mb-3">
                <div
                  draggable
                  onDragStart={() => (drag.current = { kind: "song", id: song.id })}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropKey("s" + song.id);
                  }}
                  onDrop={() => onDropCue(song.id, null)}
                  className={`flex cursor-grab items-center gap-2 rounded-t bg-muted px-3 py-2 ${dropKey === "s" + song.id ? "ring-2 ring-standby" : ""}`}
                >
                  <span className="font-mono text-sm text-muted-foreground">{si + 1}</span>
                  <input
                    value={song.name}
                    onChange={(e) => renameSong(song.id, e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-lg font-bold outline-none focus:bg-input"
                  />
                  <span className="text-xs text-muted-foreground">{song.cues.length} cues</span>
                  <button onClick={() => deleteSong(song.id)} className="px-2 text-muted-foreground hover:text-destructive" aria-label="Slet sang">✕</button>
                </div>
                {song.cues.map((c) => {
                  const idx = flat.indexOf(c);
                  const isStandby = c.id === standbyId;
                  const isRunning = active.some((a) => a.cueId === c.id);
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => (drag.current = { kind: "cue", id: c.id })}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropKey(c.id);
                      }}
                      onDrop={(e) => {
                        e.stopPropagation();
                        onDropCue(song.id, c.id);
                      }}
                      onClick={() => setSelectedId(c.id)}
                      onDoubleClick={() => setStandbyId(c.id)}
                      className={`grid cursor-pointer grid-cols-[28px_44px_1fr_auto_auto] items-center gap-2 border-b border-l-[6px] border-border px-2 py-2 ${
                        selectedId === c.id ? "bg-accent" : "bg-card hover:bg-secondary"
                      } ${dropKey === c.id ? "border-t-2 border-t-standby" : ""} ${isStandby ? "outline outline-2 -outline-offset-2 outline-standby" : ""}`}
                      style={{ borderLeftColor: cueColor(show, c) }}
                    >
                      <span className="text-center font-black text-standby">{isStandby ? "▶" : isRunning ? <span className="text-go">●</span> : ""}</span>
                      <span className="font-mono text-sm text-muted-foreground">{idx + 1}</span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{c.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{summary(c, midiPorts)}</div>
                      </div>
                      <TypeTag show={show} cue={c} />
                      <span className="w-24 text-right font-mono text-xs text-muted-foreground">{followLabel(c)}</span>
                    </div>
                  );
                })}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropKey("e" + song.id);
                  }}
                  onDrop={() => onDropCue(song.id, null)}
                  className={`h-3 rounded-b bg-muted/40 ${dropKey === "e" + song.id ? "bg-standby" : ""}`}
                />
              </section>
            ))}
            {!show.songs.length && <div className="p-8 text-center text-muted-foreground">Tilføj en sang for at komme i gang</div>}
          </div>
        </div>
</FloatingWindow>
<FloatingWindow title={"Cue Inspector"} state={wins.inspector} onChange={(p) => setWin("inspector", p)} onFocus={() => focusWin("inspector")}>
<div className="p-4">
          {selected ? (
            <Inspector
              key={selected.id}
              cue={selected}
              show={show}
              flat={flat}
              midiPorts={midiPorts}
              outputs={outputs}
              onChange={(p) => updateCue(selected.id, p)}
              onDelete={() => deleteCue(selected.id)}
              onStandby={() => setStandbyId(selected.id)}
              onFire={() => engine().execute(selected)}
              onFile={async (f) => {
                const id = uid();
                await putAudio(id, f);
                updateCue(selected.id, { fileId: id, fileName: f.name, name: selected.name === "Lyd" ? f.name.replace(/\.[^.]+$/, "") : selected.name } as Partial<Cue>);
              }}
              onTestMidi={(m) => engine().sendMidi(m)}
            />
          ) : (
            <div className="text-muted-foreground">Vælg et cue for at redigere. Dobbeltklik for at sætte det som standby.</div>
          )}
        </div>
</FloatingWindow>
<FloatingWindow title={"Fodpedal (MIDI)"} state={wins.pedal} onChange={(p) => setWin("pedal", p)} onFocus={() => focusWin("pedal")}>
<PedalPanel map={pedals} learning={learning} last={lastMidi} onLearn={setLearning} onClear={(k) => setPedals((m) => { const n = { ...m }; delete n[k]; return n; })} />
</FloatingWindow>
</div>

      {settings && (
        <Settings
          show={show}
          setShow={setShow}
          midiPorts={midiPorts}
          outputs={outputs}
          onClose={() => setSettings(false)}
          onScanMidi={() => engine().initMidi().then(setMidiPorts).catch((e) => setError(e.message))}
          onScanAudio={() => listAudioOutputs(true).then((o) => setOutputs(dedupe(o))).catch((e) => setError(e.message))}
          onTestMidi={(port) => engine().sendMidi({ id: "t", port, kind: "noteon", channel: 1, data1: 60, data2: 127 })}
        />
      )}
    </div>
  );
}

function dedupe(o: Output[]): Output[] {
  const list = [{ id: "", label: "Standard udgang" }, ...o.filter((x) => x.id)];
  return list.filter((x, i) => list.findIndex((y) => y.id === x.id) === i);
}

function cueColorById(show: Show, id: string) {
  const c = flatten(show).find((x) => x.id === id);
  return c ? cueColor(show, c) : "#888";
}

function followLabel(c: Cue) {
  const pre = c.preWait > 0 ? `⏱${c.preWait}s ` : "";
  if (c.follow === "manual") return pre + "GO";
  return pre + (c.follow === "withStart" ? "→ start" : "→ slut") + (c.postWait ? `+${c.postWait}s` : "");
}

function summary(c: Cue, ports: string[]): string {
  switch (c.type) {
    case "audio":
      return `${c.fileName || "ingen fil"} · ${c.volume}dB${c.loop ? " · loop" : ""}`;
    case "midi":
      return c.messages.map((m) => `${m.port || "?"}${ports.includes(m.port) ? "" : "⚠"} ${m.kind.toUpperCase()} ch${m.channel} ${m.data1}${m.kind === "pc" ? "" : "/" + m.data2}`).join(" · ");
    case "fade":
      return `${c.target === "all" ? "alle" : "mål"} → ${c.volume}dB over ${c.duration}s`;
    case "stop":
      return `${c.target === "all" ? "alle" : "mål"} · fade ${c.duration}s`;
    case "pause":
      return c.target === "all" ? "alle" : "mål";
    case "wait":
      return `${c.duration}s`;
    case "memo":
      return c.text.split("\n")[0] ?? "";
  }
}

function TypeTag({ show, cue }: { show: Show; cue: Cue }) {
  return (
    <span className="rounded px-2 py-0.5 text-xs font-bold uppercase text-background" style={{ backgroundColor: cueColor(show, cue) }}>
      {TYPE_LABEL[cue.type]}
    </span>
  );
}

function TimeBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2 text-center">
      <div className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-2xl tabular-nums ${accent ? "text-standby" : ""}`}>{value}</div>
    </div>
  );
}

function ActiveBar({ row, color, onStop }: { row: ActiveRow; color: string; onStop: () => void }) {
  const pct = row.duration ? Math.min(100, (row.elapsed / row.duration) * 100) : 0;
  return (
    <div className="relative overflow-hidden rounded border border-border bg-secondary">
      <div className="absolute inset-y-0 left-0 opacity-40" style={{ width: `${pct}%`, backgroundColor: color }} />
      <div className="relative flex items-center gap-2 px-2 py-1.5 text-sm">
        <span className="font-bold">{row.state === "pre" ? "⏱" : row.state === "paused" ? "❚❚" : "▶"}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">{row.name}</span>
        <span className="font-mono tabular-nums">{fmt(row.elapsed)}</span>
        <span className="font-mono tabular-nums text-standby">-{fmt((row.duration ?? 0) - row.elapsed)}</span>
        {row.type === "audio" && (
          <button onClick={onStop} className="px-1 text-destructive" aria-label="Stop">■</button>
        )}
      </div>
    </div>
  );
}

function Btn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded bg-secondary px-3 py-1.5 text-sm font-semibold hover:bg-accent">
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {label}
      <div className="font-normal normal-case tracking-normal text-foreground">{children}</div>
    </label>
  );
}

const inputCls = "w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring";

function Num({ value, onChange, step = 0.1, min, max }: { value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number }) {
  return <input type="number" className={inputCls} value={value} step={step} min={min} max={max} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />;
}

function TargetSelect({ value, flat, onChange }: { value: string; flat: Cue[]; onChange: (v: string) => void }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">Alle lyd-cues</option>
      {flat.filter((c) => c.type === "audio").map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}

function Inspector(props: {
  cue: Cue; show: Show; flat: Cue[]; midiPorts: string[]; outputs: Output[];
  onChange: (p: Partial<Cue>) => void; onDelete: () => void; onStandby: () => void; onFire: () => void;
  onFile: (f: File) => void; onTestMidi: (m: MidiMsg) => void;
}) {
  const { cue, show, flat, midiPorts, outputs, onChange } = props;
  const set = (p: Record<string, unknown>) => onChange(p as Partial<Cue>);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <TypeTag show={show} cue={cue} />
        <div className="ml-auto flex gap-1">
          <Btn onClick={props.onStandby}>Standby</Btn>
          <Btn onClick={props.onFire}>Test</Btn>
          <button onClick={props.onDelete} className="rounded bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground">Slet</button>
        </div>
      </div>
      <Field label="Navn"><input className={inputCls} value={cue.name} onChange={(e) => set({ name: e.target.value })} /></Field>

      <div className="rounded border border-border p-2">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-standby">Afvikling</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pre-wait (s)"><Num value={cue.preWait} onChange={(n) => set({ preWait: Math.max(0, n) })} /></Field>
          <Field label="Post-wait (s)"><Num value={cue.postWait} onChange={(n) => set({ postWait: Math.max(0, n) })} /></Field>
        </div>
        <div className="mt-2">
          <Field label="Næste cue">
            <select className={inputCls} value={cue.follow} onChange={(e) => set({ follow: e.target.value })}>
              <option value="manual">Manuel – venter på GO</option>
              <option value="withStart">Auto-follow – når dette cue starter (+ post-wait)</option>
              <option value="afterEnd">Auto-follow – når dette cue slutter (+ post-wait)</option>
            </select>
          </Field>
        </div>
      </div>

      <Field label="Farve (kun dette cue)">
        <div className="flex items-center gap-2">
          <input type="color" value={cueColor(show, cue)} onChange={(e) => set({ color: e.target.value })} className="h-8 w-14 cursor-pointer bg-transparent" />
          {cue.color && <button className="text-sm text-muted-foreground underline" onClick={() => set({ color: undefined })}>Brug type-farve</button>}
        </div>
      </Field>

      {cue.type === "audio" && (
        <>
          <Field label="Lydfil">
            <input type="file" accept="audio/*" className="text-sm" onChange={(e) => e.target.files?.[0] && props.onFile(e.target.files[0])} />
            <div className="mt-1 truncate text-xs text-muted-foreground">{cue.fileName || "Ingen fil valgt"}</div>
          </Field>
          <Field label="Lydudgang">
            <select className={inputCls} value={cue.outputId} onChange={(e) => set({ outputId: e.target.value })}>
              {outputs.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              {!outputs.some((o) => o.id === cue.outputId) && <option value={cue.outputId}>(ukendt udgang – scan igen)</option>}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Volumen (dB)"><Num value={cue.volume} step={0.5} min={-60} max={12} onChange={(n) => set({ volume: n })} /></Field>
            <Field label={`Pan (${cue.pan.toFixed(2)})`}>
              <input type="range" min={-1} max={1} step={0.05} value={cue.pan} onChange={(e) => set({ pan: parseFloat(e.target.value) })} className="w-full accent-[var(--standby)]" />
            </Field>
            <Field label="Fade-in (s)"><Num value={cue.fadeIn} onChange={(n) => set({ fadeIn: Math.max(0, n) })} /></Field>
            <Field label="Fade-out (s)"><Num value={cue.fadeOut} onChange={(n) => set({ fadeOut: Math.max(0, n) })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cue.loop} onChange={(e) => set({ loop: e.target.checked })} /> Loop</label>
        </>
      )}

      {cue.type === "midi" && (
        <div className="flex flex-col gap-2">
          {cue.messages.map((m, i) => {
            const upd = (p: Partial<MidiMsg>) => set({ messages: cue.messages.map((x) => (x.id === m.id ? { ...x, ...p } : x)) });
            return (
              <div key={m.id} className="rounded border border-border p-2">
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-muted-foreground">
                  Besked {i + 1}
                  <span className="flex gap-2">
                    <button className="text-go" onClick={() => props.onTestMidi(m)}>Send</button>
                    <button className="text-destructive" onClick={() => set({ messages: cue.messages.filter((x) => x.id !== m.id) })}>Fjern</button>
                  </span>
                </div>
                <select className={inputCls} value={m.port} onChange={(e) => upd({ port: e.target.value })}>
                  <option value="">Vælg port…</option>
                  {midiPorts.map((p) => <option key={p} value={p}>{p}</option>)}
                  {m.port && !midiPorts.includes(m.port) && <option value={m.port}>{m.port} (ikke tilsluttet)</option>}
                </select>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  <select className={inputCls} value={m.kind} onChange={(e) => upd({ kind: e.target.value as MidiMsg["kind"] })}>
                    <option value="noteon">Note On</option>
                    <option value="noteoff">Note Off</option>
                    <option value="cc">CC</option>
                    <option value="pc">PC</option>
                  </select>
                  <input title="Kanal" type="number" min={1} max={16} className={inputCls} value={m.channel} onChange={(e) => upd({ channel: +e.target.value })} />
                  <input title={m.kind === "cc" ? "Controller" : m.kind === "pc" ? "Program" : "Note"} type="number" min={0} max={127} className={inputCls} value={m.data1} onChange={(e) => upd({ data1: +e.target.value })} />
                  {m.kind !== "pc" && <input title={m.kind === "cc" ? "Værdi" : "Velocity"} type="number" min={0} max={127} className={inputCls} value={m.data2} onChange={(e) => upd({ data2: +e.target.value })} />}
                </div>
                <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
                  <span>Type</span><span>Kanal</span><span>{m.kind === "cc" ? "CC#" : m.kind === "pc" ? "Program" : "Note"}</span><span>{m.kind === "pc" ? "" : m.kind === "cc" ? "Værdi" : "Velocity"}</span>
                </div>
              </div>
            );
          })}
          <Btn onClick={() => set({ messages: [...cue.messages, newMidiMsg()] })}>+ Tilføj MIDI-besked</Btn>
        </div>
      )}

      {cue.type === "fade" && (
        <>
          <Field label="Mål"><TargetSelect value={cue.target} flat={flat} onChange={(v) => set({ target: v })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Til volumen (dB)"><Num value={cue.volume} step={0.5} min={-60} max={12} onChange={(n) => set({ volume: n })} /></Field>
            <Field label="Varighed (s)"><Num value={cue.duration} onChange={(n) => set({ duration: Math.max(0, n) })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cue.stopAfter} onChange={(e) => set({ stopAfter: e.target.checked })} /> Stop efter fade</label>
        </>
      )}
      {cue.type === "stop" && (
        <>
          <Field label="Mål"><TargetSelect value={cue.target} flat={flat} onChange={(v) => set({ target: v })} /></Field>
          <Field label="Fade-out (s)"><Num value={cue.duration} onChange={(n) => set({ duration: Math.max(0, n) })} /></Field>
        </>
      )}
      {cue.type === "pause" && (
        <Field label="Mål (pause/genoptag)"><TargetSelect value={cue.target} flat={flat} onChange={(v) => set({ target: v })} /></Field>
      )}
      {cue.type === "wait" && <Field label="Varighed (s)"><Num value={cue.duration} onChange={(n) => set({ duration: Math.max(0, n) })} /></Field>}
      {cue.type === "memo" && (
        <Field label="Tekst (vises stort i standby)">
          <textarea rows={6} className={inputCls} value={cue.text} onChange={(e) => set({ text: e.target.value })} />
        </Field>
      )}
      <Field label="Noter">
        <textarea rows={3} className={inputCls} value={cue.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
    </div>
  );
}

function Settings(props: {
  show: Show; setShow: (s: Show) => void; midiPorts: string[]; outputs: Output[]; onClose: () => void;
  onScanMidi: () => void; onScanAudio: () => void; onTestMidi: (port: string) => void;
}) {
  const { show, setShow } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6" onClick={props.onClose}>
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Indstillinger</h2>
          <Btn onClick={props.onClose}>Luk</Btn>
        </div>

        <Section title="MIDI-udgange" action={<Btn onClick={props.onScanMidi}>Scan</Btn>}>
          {props.midiPorts.length ? props.midiPorts.map((p) => (
            <div key={p} className="flex items-center justify-between border-b border-border py-1.5">
              <span>{p}</span>
              <button className="text-sm font-semibold text-go" onClick={() => props.onTestMidi(p)}>Test (Note 60 ch1)</button>
            </div>
          )) : <p className="text-sm text-muted-foreground">Ingen MIDI-porte fundet. Opret fx loopMIDI-porte på Windows og tryk Scan.</p>}
        </Section>

        <Section title="Lydudgange" action={<Btn onClick={props.onScanAudio}>Scan enheder</Btn>}>
          {props.outputs.map((o) => <div key={o.id} className="border-b border-border py-1.5 text-sm">{o.label}</div>)}
          <p className="mt-2 text-xs text-muted-foreground">Scan beder om mikrofon-adgang én gang – det er nødvendigt for at browseren viser navne som "VoiceMeeter Input" og "VoiceMeeter AUX Input".</p>
        </Section>

        <Section title="Farver pr. cue-type">
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input type="color" value={show.typeColors[t] || DEFAULT_TYPE_COLORS[t]} onChange={(e) => setShow({ ...show, typeColors: { ...show.typeColors, [t]: e.target.value } })} className="h-7 w-10 cursor-pointer bg-transparent" />
                {TYPE_LABEL[t]}
              </label>
            ))}
          </div>
          <button className="mt-2 text-sm text-muted-foreground underline" onClick={() => setShow({ ...show, typeColors: {} })}>Nulstil farver</button>
        </Section>

        <Section title="Panic">
          <Field label="Nød-fade tid (s, 0 = øjeblikkelig)"><Num value={show.panicFade} onChange={(n) => setShow({ ...show, panicFade: Math.max(0, n) })} /></Field>
        </Section>
        <p className="text-xs text-muted-foreground">Lydfiler gemmes i browseren på denne computer. Show-filen (JSON) indeholder kun filnavne – på en ny computer skal lydfilerne vælges igen.</p>
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-standby">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

const NOTE_SIZES = ["text-xl", "text-3xl", "text-5xl"];

function StageView(props: {
  show: Show; flat: Cue[]; standby: Cue | null; standbyIdx: number;
  size: 0 | 1 | 2; setSize: (n: 0 | 1 | 2) => void; onNotes: (v: string) => void;
}) {
  const { show, flat, standby, standbyIdx } = props;
  const songIdx = standby ? show.songs.findIndex((s) => s.cues.some((c) => c.id === standby.id)) : -1;
  const song = songIdx >= 0 ? show.songs[songIdx]! : null;
  const cueInSong = song && standby ? song.cues.findIndex((c) => c.id === standby.id) + 1 : 0;
  const nIdx = standbyIdx >= 0 ? nextStandbyIndex(flat, standbyIdx) : -1;
  const after = nIdx >= 0 ? flat[nIdx] : null;
  const afterSong = after ? show.songs.find((s) => s.cues.some((c) => c.id === after.id)) : null;
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-lg font-bold text-muted-foreground">SANG {songIdx >= 0 ? songIdx + 1 : "–"}/{show.songs.length}</span>
        <span className="min-w-0 flex-1 truncate text-4xl font-black uppercase">{song?.name ?? "Slut på show"}</span>
      </div>
      {standby ? (
        <div className="rounded-lg border-l-[12px] bg-muted px-4 py-3" style={{ borderLeftColor: cueColor(show, standby) }}>
          <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-standby">
            <span>Næste GO · cue {cueInSong}/{song?.cues.length}</span>
            <TypeTag show={show} cue={standby} />
            {standby.preWait > 0 && <span className="text-muted-foreground">pre-wait {standby.preWait}s</span>}
          </div>
          <div className="truncate text-5xl font-black leading-tight">{standby.name}</div>
          {standby.type === "memo" && standby.text && <div className="mt-1 whitespace-pre-wrap text-2xl text-memo">{standby.text}</div>}
        </div>
      ) : (
        <div className="rounded-lg bg-muted px-4 py-6 text-3xl font-bold text-muted-foreground">Ingen flere cues</div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Noter til næste cue</span>
        <div className="ml-auto flex gap-1">
          {(["A", "A+", "A++"] as const).map((l, i) => (
            <button key={l} onClick={() => props.setSize(i as 0 | 1 | 2)} className={`rounded px-2 text-xs font-bold ${props.size === i ? "bg-standby text-background" : "bg-secondary"}`}>{l}</button>
          ))}
        </div>
      </div>
      <textarea
        value={standby?.notes ?? ""}
        disabled={!standby}
        onChange={(e) => props.onNotes(e.target.value)}
        placeholder="Skriv noter til dette cue…"
        className={`min-h-0 flex-1 resize-none rounded-md border border-border bg-background p-3 font-semibold leading-snug text-memo outline-none focus:border-standby ${NOTE_SIZES[props.size]}`}
      />
      <div className="truncate border-t border-border pt-2 text-lg text-muted-foreground">
        Derefter: {after ? <><span className="font-bold text-foreground">{after.name}</span>{afterSong && afterSong !== song && <span className="ml-2 text-standby">→ ny sang: {afterSong.name}</span>}</> : "—"}
      </div>
    </div>
  );
}

function PedalPanel(props: {
  map: PedalMap; learning: PedalAction | null; last: MidiIn | null;
  onLearn: (a: PedalAction | null) => void; onClear: (a: PedalAction) => void;
}) {
  return (
    <div className="flex flex-col gap-2 p-3 text-sm">
      <p className="text-muted-foreground">Tryk "Lær" og træd på kontakten på din Nektar Pacer.</p>
      {(Object.keys(PEDAL_LABEL) as PedalAction[]).map((a) => (
        <div key={a} className="flex items-center gap-2 rounded bg-muted px-2 py-1.5">
          <span className="w-24 font-bold">{PEDAL_LABEL[a]}</span>
          <span className="flex-1 font-mono text-xs text-muted-foreground">{props.learning === a ? "Venter på pedal…" : midiInLabel(props.map[a])}</span>
          <button onClick={() => props.onLearn(props.learning === a ? null : a)} className={`rounded px-2 py-1 text-xs font-bold ${props.learning === a ? "bg-standby text-background" : "bg-secondary"}`}>{props.learning === a ? "Annullér" : "Lær"}</button>
          {props.map[a] && <button onClick={() => props.onClear(a)} className="px-1 text-muted-foreground hover:text-destructive" aria-label="Fjern">✕</button>}
        </div>
      ))}
      <div className="font-mono text-xs text-muted-foreground">Sidst modtaget: {props.last ? midiInLabel(props.last) : "intet"}</div>
    </div>
  );
}
