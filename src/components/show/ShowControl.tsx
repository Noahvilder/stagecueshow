import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Engine, listAudioOutputs, type ActiveRow } from "@/lib/show/engine";
import { putAudio, getAudio } from "@/lib/show/audioStore";
import { collectFileIds, packArchive, unpackArchive } from "@/lib/show/archive";
import {
  DEFAULT_TYPE_COLORS, TYPE_LABEL, cueColor, emptyShow, flatten, fmt, moveCue, moveSong,
  newCue, newMidiMsg, MIDI_KINDS, midiKindInfo, noteName, nextStandbyIndex, parseShow, uid,
} from "@/lib/show/logic";
import type { Cue, CueType, MidiMsg, Show } from "@/lib/show/types";
import { ioName } from "@/lib/show/types";
import { RemoteHost } from "./RemoteHost";
import { MonitorNotes } from "./MonitorNotes";
import { MonitorProfiles } from "./MonitorProfiles";
import type { RemoteCmd, RemoteState } from "@/lib/show/remote";
import { FloatingWindow, type WinState } from "./FloatingWindow";
import { Waveform } from "./Waveform";
import { MenuBar, type Menu } from "./MenuBar";
import { CommandPalette } from "./CommandPalette";
import { COLS, DEFAULT_VIEW, applyTips, gridCols, loadView, saveView, type ColKey, type ViewPrefs } from "@/lib/show/view";
import { ClickGenerator } from "./ClickGenerator";
import { ProDialog } from "./ProGate";
import { usePlan } from "@/lib/show/usePlan";
import { hasPro, type ProFeature } from "@/lib/show/plan";
import { SHORTCUT_LABEL, assign, comboOf, findAction, loadShortcuts, prettyCombo, saveShortcuts, DEFAULT_SHORTCUTS, type ShortcutAction, type ShortcutMap } from "@/lib/show/shortcuts";
import { MidiMonitor, type MidiLogRow } from "./MidiMonitor";
import { PEDAL_LABEL, matchPedal, midiInLabel, parseMidiIn, type MidiIn, type PedalAction, type PedalMap } from "@/lib/show/pedal";

type WinKey = "stage" | "transport" | "list" | "inspector" | "pedal" | "remote" | "midimon";
const WIN_KEY = "stagecue.windows.v1";
const PEDAL_KEY = "stagecue.pedals.v1";
const defaultWins = (): Record<WinKey, WinState> => ({
  stage: { x: 12, y: 12, w: 620, h: 430, z: 5, open: true, min: false },
  transport: { x: 12, y: 454, w: 360, h: 470, z: 4, open: true, min: false },
  list: { x: 644, y: 12, w: 620, h: 700, z: 3, open: true, min: false },
  inspector: { x: 1276, y: 12, w: 400, h: 700, z: 2, open: true, min: false },
  pedal: { x: 384, y: 454, w: 360, h: 330, z: 1, open: false, min: false },
  remote: { x: 756, y: 454, w: 320, h: 470, z: 1, open: false, min: false },
  midimon: { x: 1088, y: 454, w: 560, h: 360, z: 1, open: false, min: false },
});
const simpleWins = (): Record<WinKey, WinState> => {
  const d = defaultWins();
  for (const k of Object.keys(d) as WinKey[]) d[k].open = k === "stage" || k === "transport" || k === "list";
  d.list = { ...d.list, w: 760, h: 912 };
  return d;
};
const WIN_TITLES: Record<WinKey, string> = { stage: "Scene", transport: "Transport", list: "Setliste", inspector: "Inspector", pedal: "MIDI-controller", remote: "Telefon", midimon: "MIDI Monitor" };

const TYPES: CueType[] = ["audio", "midi", "fade", "stop", "pause", "wait", "memo", "group"];
const CHILD_TYPES: CueType[] = ["audio", "midi", "fade", "stop", "pause", "wait", "memo"];

type Output = { id: string; label: string };

export function ShowControl({ showId }: { showId: string }) {
  const navigate = useNavigate();
  const engineRef = useRef<Engine | null>(null);
  const [show, setShow] = useState<Show>(emptyShow);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<"ok" | "saving" | "error">("ok");
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
  const [locked, setLocked] = useState(false);
  const plan = usePlan();
  const pro = hasPro(plan.tier);
  const [proAsk, setProAsk] = useState<ProFeature | null>(null);
  const needPro = useCallback((f: ProFeature) => { if (pro) return true; setProAsk(f); return false; }, [pro]);
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(DEFAULT_SHORTCUTS);
  useEffect(() => setShortcuts(loadShortcuts()), []);
  const scRef = useRef<{ map: ShortcutMap; add: (t: CueType) => void; mute: () => void; stop: () => void; save: () => void; backup: () => void; open: () => void }>({ map: DEFAULT_SHORTCUTS, add: () => {}, mute: () => {}, stop: () => {}, save: () => {}, backup: () => {}, open: () => {} });
  const [view, setView] = useState<ViewPrefs>(DEFAULT_VIEW);
  const [viewOpen, setViewOpen] = useState(false);
  useEffect(() => { setView(loadView()); }, []);
  useEffect(() => applyTips(view.tips), [view.tips]);
  const toggleCol = (k: ColKey) => setView((v) => { const n = { ...v, [k]: !v[k] }; saveView(n); return n; });
  const [muted, setMuted] = useState(false);
  const [midiIns, setMidiIns] = useState<string[]>([]);
  const [midiLog, setMidiLog] = useState<MidiLogRow[]>([]);
  const [monPaused, setMonPaused] = useState(false);
  const monPausedRef = useRef(false);
  monPausedRef.current = monPaused;
  const logId = useRef(0);
  const [recovered, setRecovered] = useState<string | null>(null);
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
      engineRef.current.onMidiLog = (dir, port, bytes) => {
        if (monPausedRef.current) return;
        const row = { id: ++logId.current, t: Date.now(), dir, port, bytes };
        setMidiLog((l) => [row, ...l].slice(0, 300));
      };
      engineRef.current.onMidiPorts = (outs, ins) => { setMidiPorts(outs); setMidiIns(ins); };
    }
    return engineRef.current;
  };

  const flat = useMemo(() => flatten(show), [show]);
  const standbyIdx = flat.findIndex((c) => c.id === standbyId);
  const standby = standbyIdx >= 0 ? flat[standbyIdx] : null;
  const selected = flat.find((c) => c.id === selectedId) ?? null;

  // load + autosave
  useEffect(() => {
    supabase.from("shows").select("name,data").eq("id", showId).single().then(({ data, error: e }) => {
      if (e || !data) { setError("Kunne ikke hente show: " + (e?.message ?? "ikke fundet")); return; }
      try { setShow(parseShow(JSON.stringify({ ...emptyShow(), ...(data.data as object), name: data.name }))); } catch { setShow({ ...emptyShow(), name: data.name }); }
      setLoaded(true);
    });
    engine()
      .initMidi()
      .then((o) => { setMidiPorts(o); setMidiIns(engine().midiInputs()); })
      .catch((e) => setError(e.message));
    listAudioOutputs(false).then((o) => setOutputs(dedupe(o))).catch(() => {});
    const onDev = () => listAudioOutputs(false).then((o) => setOutputs(dedupe(o))).catch(() => {});
    navigator.mediaDevices?.addEventListener?.("devicechange", onDev);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", onDev);
  }, []);

  // hardware watchdog
  const seenIns = useRef(new Set<string>());
  midiIns.forEach((i) => seenIns.current.add(i));
  const warnings = useMemo(() => {
    const w: string[] = [];
    for (const i of seenIns.current) if (!midiIns.includes(i)) w.push(`MIDI-indgang frakoblet: ${i}`);
    const outsUsed = new Set<string>(), audioUsed = new Set<string>();
    flat.forEach((c) => {
      if (c.type === "midi") c.messages.forEach((m) => m.port && outsUsed.add(m.port));
      if (c.type === "audio" && c.outputId) audioUsed.add(c.outputId);
    });
    if (midiPorts.length || midiIns.length || seenIns.current.size) for (const p of outsUsed) if (!midiPorts.includes(p)) w.push(`MIDI-udgang mangler: ${p}`);
    if (outputs.length > 1) for (const a of audioUsed) if (!outputs.some((o) => o.id === a)) w.push("Lydudgang mangler (brugt af lyd-cue)");
    return [...new Set(w)];
  }, [midiIns, midiPorts, outputs, flat]);
  const prevWarn = useRef<string[]>([]);
  useEffect(() => {
    const fixed = prevWarn.current.filter((x) => !warnings.includes(x));
    prevWarn.current = warnings;
    if (fixed.length) {
      setRecovered("✓ Genforbundet: " + fixed.map((f) => f.split(": ")[1] ?? f).join(", "));
      const t = setTimeout(() => setRecovered(null), 4000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [warnings]);
  const toggleMute = (on?: boolean) => setMuted((m) => { const v = on ?? !m; engine().setMute(v); return v; });
  scRef.current.mute = () => toggleMute();
  useEffect(() => {
    if (!loaded) return;
    setSaved("saving");
    const t = setTimeout(async () => {
      const { error: e } = await supabase.from("shows").update({ name: show.name, data: show as never, updated_at: new Date().toISOString() }).eq("id", showId);
      setSaved(e ? "error" : "ok");
    }, 700);
    return () => clearTimeout(t);
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
  scRef.current.stop = hardStop;

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
      if (t.closest("[data-shortcut-capture]")) return;
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "s") { e.preventDefault(); if (e.shiftKey) scRef.current.backup(); else scRef.current.save(); return; }
        if (key === "o") { e.preventDefault(); scRef.current.open(); return; }
      }
      const combo = comboOf(e);
      const a = findAction(scRef.current.map, combo);
      if (!a) return;
      const typing = !!t.closest("input, textarea, select, [contenteditable]");
      if (typing && !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (a === "go") { if (!e.repeat) go(); }
      else if (a === "panic") panic();
      else if (a === "hardStop") scRef.current.stop();
      else if (a === "next") step(1);
      else if (a === "prev") step(-1);
      else if (a === "lock") setLocked((l) => !l);
      else if (a === "help") setKeysOpen((o) => !o);
      else if (a === "mute") scRef.current.mute();
      else if (a.startsWith("add:") && !e.repeat) scRef.current.add(a.slice(4) as CueType);
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
  scRef.current.map = shortcuts;
  scRef.current.add = (t) => addCue(t);
  const addCue = (type: CueType) => {
    if (locked) return;
    if (type === "group" && !needPro("group")) return;
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
  const [clickOpen, setClickOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const importSetlist = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*\d+[.)\-:]?\s*/, "").trim()).filter(Boolean);
    if (!lines.length) return;
    setShow((s) => ({ ...s, songs: [...s.songs, ...lines.map((name) => ({ id: uid(), name, cues: [{ ...newCue("memo"), name } as Cue] }))] }));
    setImportOpen(false);
  };
  const createClickCue = async (blob: Blob, name: string) => {
    const id = uid();
    await putAudio(id, blob);
    const c = { ...newCue("audio"), name, fileId: id, fileName: `${name}.wav` } as Cue;
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
  const exportBackup = async () => {
    const audio: Record<string, Uint8Array> = {};
    for (const id of collectFileIds(show)) {
      const b = await getAudio(id);
      if (b) audio[id] = new Uint8Array(await b.arrayBuffer());
    }
    const blob = new Blob([packArchive(show, audio) as BlobPart], { type: "application/zip" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${show.name.replace(/[^\wæøåÆØÅ -]/g, "") || "show"}.stagecue`;
    a.click();
    URL.revokeObjectURL(a.href);
  };  scRef.current.save = exportShow;
  scRef.current.backup = () => { void exportBackup(); };
  scRef.current.open = () => { if (!locked) fileRef.current?.click(); };

  const importShow = async (f: File) => {
    try {
      let text: string;
      if (f.name.endsWith(".stagecue")) {
        const { showJson, audio } = unpackArchive(new Uint8Array(await f.arrayBuffer()));
        for (const [id, bytes] of Object.entries(audio)) await putAudio(id, new Blob([bytes as BlobPart]));
        text = showJson;
      } else text = await f.text();
      const s = parseShow(text);
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
  const remoteState = useMemo<RemoteState>(() => ({
    showName: show.name,
    monitors: show.monitors ?? [],
    midiPorts,
    standbyId,
    running: [...new Set(active.map((a) => a.cueId))],
    muted,
    locked,
    songs: show.songs.map((s) => ({ id: s.id, name: s.name, cues: s.cues.map((c) => ({ id: c.id, name: c.name, type: c.type, color: cueColor(show, c), notes: c.notes ?? "", monitorNotes: c.monitorNotes ?? {}, text: c.type === "memo" ? c.text : "", stikord: c.stikord ?? "", hasAudio: c.type === "audio" && !!c.fileId })) })),
  }), [show, standbyId, active, midiPorts, muted, locked]);
  const onRemote = (c: RemoteCmd) => {
    if (c.t === "go") go();
    else if (c.t === "panic") panic();
    else if (c.t === "stopAll") hardStop();
    else if (c.t === "step") step(c.d);
    else if (c.t === "standby") flat.some((x) => x.id === c.id) && setStandbyId(c.id);
    else if (c.t === "fire") { const cue = flat.find((x) => x.id === c.id); if (cue) engine().go([cue], 0); }
    else if (c.t === "stopCue") engine().stopCue(c.id);
    else if (c.t === "setShow") { if (!locked) setShow(c.show); }
    else if (c.t === "mute") toggleMute(c.on);
    else if (c.t === "testMidi") engine().sendMidi(c.msg);
    else if (c.t === "setMonitorNote") {
      if (!show.monitors?.some((m) => m.id === c.monitor) || typeof c.text !== "string") return;
      const text = c.text.slice(0, 20000);
      const upd = (x: Cue): Cue => {
        const y = x.id === c.cueId ? { ...x, monitorNotes: { ...(x.monitorNotes ?? {}), [c.monitor]: text } } : x;
        return y.type === "group" ? { ...y, children: y.children.map(upd) } : y;
      };
      setShow({ ...show, songs: show.songs.map((s) => ({ ...s, cues: s.cues.map(upd) })) });
    }
  };
  const mainRun = active.filter((a) => a.state !== "pre" && a.duration && isFinite(a.duration)).sort((a, b) => b.duration! - b.elapsed - (a.duration! - a.elapsed))[0];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      {(() => { const menus: Menu[] = [
        { label: "Filer", items: [
          { label: "Åbn show…", keys: "Ctrl+O", onClick: () => fileRef.current?.click(), disabled: locked },
          { label: "Gem show", keys: "Ctrl+S", onClick: exportShow },
          { label: "Eksportér backup m. lyd (.stagecue)…", keys: "Ctrl+Shift+S", onClick: exportBackup },
          "sep",
          { label: "Importér setliste…", onClick: () => setImportOpen(true), disabled: locked },
          "sep",
          { label: "Tilbage til shows", onClick: () => { engine().panic(0); navigate({ to: "/hub" }); } },
        ] },
        { label: "Rediger", items: [
          ...(["audio", "midi", "fade", "stop", "memo", "group"] as CueType[]).map((t) => ({ label: `Nyt ${t}-cue`, onClick: () => addCue(t), disabled: locked })),
          "sep",
          { label: locked ? "Lås show op" : "Lås show til live", keys: "Ctrl+L", onClick: () => setLocked((l) => !l) },
        ] },
        { label: "Værktøjer", items: [
          { label: "⏱️ Click / Optælling…", onClick: () => setClickOpen(true), disabled: locked },
          { label: "📋 Importér setliste…", onClick: () => setImportOpen(true), disabled: locked },
          { label: "⌨️ Genveje…", keys: "Ctrl+K", onClick: () => setKeysOpen(true) },
        ] },
        { label: "Visning", items: [
          { label: "🟢 Simpel visning", onClick: () => setWins(simpleWins()), disabled: locked },
          { label: "⚙️ Avanceret visning", onClick: () => setWins(() => { const d = defaultWins(); d.midimon.open = true; d.pedal.open = true; return d; }), disabled: locked },
          { label: "Nulstil layout", onClick: () => setWins(defaultWins()), disabled: locked },
          "sep",
          ...(Object.keys(COLS) as ColKey[]).map((k) => ({ label: COLS[k], checked: view[k], onClick: () => toggleCol(k) })),
        ] },
        { label: "Vinduer", items: (Object.keys(WIN_TITLES) as WinKey[]).map((k) => ({ label: WIN_TITLES[k], checked: wins[k].open, disabled: locked, onClick: () => (wins[k].open ? setWin(k, { open: false }) : (setWin(k, { open: true, min: false }), focusWin(k))) })) },
        { label: "Indstillinger", items: [{ label: "Lyd, MIDI, I/O-navne & monitorer…", onClick: () => setSettings(true), disabled: locked }] },
        { label: "Hjælp", items: [
          { label: "⌨️ Tastaturgenveje", keys: "Ctrl+K", onClick: () => setKeysOpen(true) },
          { label: "💡 Foreslå ændring / fejl", onClick: () => window.open("/support#ticket", "_blank") },
          { label: "Support", onClick: () => window.open("/support", "_blank") },
          { label: "Vilkår", onClick: () => window.open("/vilkaar", "_blank") },
        ] },
      ]; return <div className="flex border-b border-border bg-card"><div className="flex-1 [&>div]:border-b-0"><MenuBar menus={menus} /></div><CommandPalette menus={menus} /></div>; })()}
      {/* top bar */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-2">
        <span className="font-mono text-sm font-bold tracking-widest text-go">STAGECUE</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none focus:bg-input"
          value={show.name}
          readOnly={locked}
          onChange={(e) => setShow({ ...show, name: e.target.value })}
          aria-label="Show navn"
        />
        <span className="font-mono text-2xl tabular-nums">{clock}</span>
        <span className={`text-xs ${saved === "error" ? "text-destructive" : "text-muted-foreground"}`}>{saved === "saving" ? "Gemmer…" : saved === "error" ? "Ikke gemt!" : "✓ Gemt i skyen"}</span>
        <button onClick={() => toggleMute()} className={`rounded px-3 py-1.5 text-sm font-bold ${muted ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`} title="Mute alle lydudgange">{muted ? "🔇 PA MUTED" : "🔊 PA"}</button>
        <button onClick={() => setLocked((l) => !l)} title="Ctrl+L" className={`rounded px-3 py-1.5 text-sm font-black ${locked ? "bg-standby text-background" : "bg-secondary"}`}>{locked ? "🔒 LÅST TIL LIVE" : "🔓 Lås show"}</button>
        {clickOpen && <ClickGenerator onClose={() => setClickOpen(false)} onCreate={createClickCue} />}
        {importOpen && <SetlistImport onClose={() => setImportOpen(false)} onImport={importSetlist} />}
        {keysOpen && <ShortcutManager map={shortcuts} onChange={(m) => { setShortcuts(m); saveShortcuts(m); }} onClose={() => setKeysOpen(false)} />}
        {proAsk && <ProDialog feature={proAsk} onClose={() => setProAsk(null)} />}
        {!plan.loading && plan.tier !== "pro" && <a href="/priser" target="_blank" rel="noreferrer" title="Opgrader til Pro" className={`rounded px-2 py-1 text-xs font-bold ${plan.tier === "trial" ? "bg-standby/20 text-standby" : "bg-secondary text-muted-foreground"}`}>{plan.tier === "trial" ? `PRO-prøve: ${plan.trialDaysLeft} dage` : "FREE · Opgrader"}</a>}
        <input ref={fileRef} type="file" accept=".json,.stagecue,application/json" hidden onChange={(e) => e.target.files?.[0] && importShow(e.target.files[0])} />
      </header>

      {warnings.length > 0 && (
        <div role="alert" className="animate-pulse bg-destructive px-4 py-2 text-lg font-black text-destructive-foreground">⚠️ {warnings.join(" · ")}</div>
      )}
      {recovered && <div className="bg-go px-4 py-1 text-sm font-bold text-go-foreground">{recovered}</div>}
      {error && (
        <div className="flex items-center justify-between bg-destructive px-4 py-1 text-sm font-semibold text-destructive-foreground">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="px-2">✕</button>
        </div>
      )}

<div className="relative min-h-0 flex-1 overflow-hidden">
<FloatingWindow locked={locked} title={"Scene · Nu & Næste"} state={wins.stage} onChange={(p) => setWin("stage", p)} onFocus={() => focusWin("stage")} accent>
<StageView show={show} flat={flat} standby={standby ?? null} standbyIdx={standbyIdx} warn={!!mainRun && mainRun.duration! - mainRun.elapsed <= 10} size={noteSize} setSize={setNoteSize} onNotes={(v) => standby && updateCue(standby.id, { notes: v })} />
</FloatingWindow>
<FloatingWindow locked={locked} title={"Transport"} state={wins.transport} onChange={(p) => setWin("transport", p)} onFocus={() => focusWin("transport")}>
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
{loaded && <RemoteHost showId={showId} state={remoteState} onCmd={onRemote} getAudio={async (id) => { const c = flat.find((x) => x.id === id); return c?.type === "audio" && c.fileId ? getAudio(c.fileId) : undefined; }} renderPanel={(panel) => <FloatingWindow locked={locked} title={"Telefon & scenemonitors"} state={wins.remote} onChange={(p) => setWin("remote", p)} onFocus={() => focusWin("remote")}>{panel}</FloatingWindow>} />}
<FloatingWindow locked={locked} title={"Setliste & Cues"} state={wins.list} onChange={(p) => setWin("list", p)} onFocus={() => focusWin("list")}>
<div className="flex h-full min-h-0 flex-col">
          {!locked && <div className="flex flex-wrap gap-1 border-b border-border p-2">
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
          </div>}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {show.songs.map((song, si) => (
              <section key={song.id} className="mb-3">
                <div
                  draggable={!locked}
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
                    readOnly={locked}
                    onChange={(e) => renameSong(song.id, e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-lg font-bold outline-none focus:bg-input"
                  />
                  <span className="text-xs text-muted-foreground">{song.cues.length} cues</span>
                  {!locked && <button onClick={() => deleteSong(song.id)} className="px-2 text-muted-foreground hover:text-destructive" aria-label="Slet sang">✕</button>}
                </div>
                {song.cues.map((c) => {
                  const idx = flat.indexOf(c);
                  const isStandby = c.id === standbyId;
                  const isRunning = active.some((a) => a.cueId === c.id);
                  return (
                    <div
                      key={c.id}
                      draggable={!locked}
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
                      style={{ borderLeftColor: cueColor(show, c), gridTemplateColumns: gridCols(view).replaceAll("_", " ") }}
                      className={`grid cursor-pointer items-center gap-2 border-b border-l-[6px] border-border px-2 py-2 ${
                        selectedId === c.id ? "bg-accent" : "bg-card hover:bg-secondary"
                      } ${dropKey === c.id ? "border-t-4 border-t-standby" : ""} ${isStandby ? "outline outline-2 -outline-offset-2 outline-standby" : ""}`}
                    >
                      {view.handle && <span title="Træk for at flytte" className={`select-none text-center text-muted-foreground ${locked ? "opacity-0" : "cursor-grab active:cursor-grabbing"}`}>⋮⋮</span>}
                      <span className="text-center font-black text-standby">{isStandby ? "▶" : isRunning ? <span className="text-go">●</span> : ""}</span>
                      {view.number && <span className="font-mono text-sm text-muted-foreground" title={c.ref ? `Manuskript: ${c.ref}` : undefined}>{c.number || idx + 1}</span>}
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{c.name}</div>
                        {view.details && <div className="truncate text-xs text-muted-foreground">{summary(c, midiPorts)}</div>}
                        {view.stikord && c.stikord && <div className="truncate text-xs font-bold text-standby">⏱ {c.stikord}</div>}
                      </div>
                      {view.type && <TypeTag show={show} cue={c} />}
                      {view.follow && <span className="w-24 text-right font-mono text-xs text-muted-foreground">{followLabel(c)}</span>}
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
<FloatingWindow locked={locked} title={"Cue Inspector"} state={wins.inspector} onChange={(p) => setWin("inspector", p)} onFocus={() => focusWin("inspector")}>
<div className="p-4">
          {locked ? (
            <div className="text-muted-foreground">🔒 Showet er låst til live. Tryk Ctrl+L eller "Lås show" for at redigere.</div>
          ) : selected ? (
            <Inspector
              loadAudio={(fid, out) => engine().decoded(fid, out)}
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
              needPro={needPro}
              channelCount={(o) => engine().channelCount(o)}
            />
          ) : (
            <div className="text-muted-foreground">Vælg et cue for at redigere. Dobbeltklik for at sætte det som standby.</div>
          )}
        </div>
</FloatingWindow>
<FloatingWindow locked={locked} title={"MIDI-controller"} state={wins.pedal} onChange={(p) => setWin("pedal", p)} onFocus={() => focusWin("pedal")}>
<PedalPanel map={pedals} learning={learning} last={lastMidi} onLearn={setLearning} onClear={(k) => setPedals((m) => { const n = { ...m }; delete n[k]; return n; })} />
</FloatingWindow>
<FloatingWindow locked={locked} title={"MIDI Monitor"} state={wins.midimon} onChange={(p) => setWin("midimon", p)} onFocus={() => focusWin("midimon")}>
<MidiMonitor rows={show.ioAliases?.midi ? midiLog.map((r) => ({ ...r, port: show.ioAliases?.midi?.[r.port]?.trim() || r.port })) : midiLog} paused={monPaused} setPaused={setMonPaused} onClear={() => setMidiLog([])} ins={midiIns.map((p) => show.ioAliases?.midi?.[p]?.trim() || p)} outs={midiPorts.map((p) => show.ioAliases?.midi?.[p]?.trim() || p)} />
</FloatingWindow>
</div>

      {settings && (
        <Settings
          show={show}
          setShow={setShow}
          midiPorts={midiPorts}
          midiIns={midiIns}
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
  if (c.follow === "manual") return pre + "⏹ Stop";
  return pre + (c.follow === "withStart" ? "⏩ Auto (start)" : "⏩ Auto (slut)") + (c.postWait ? `+${c.postWait}s` : "");
}

function summary(c: Cue, ports: string[]): string {
  switch (c.type) {
    case "group":
      return `${c.children.length} cues samtidig: ${c.children.map((x) => x.name).join(", ")}`;
    case "audio":
      return `${c.fileName || "ingen fil"} · ${c.volume}dB${c.loop ? " · loop" : ""}`;
    case "midi":
      return c.messages.map((m) => `${m.port || "?"}${ports.includes(m.port) ? "" : "⚠"} ${midiKindInfo(m.kind).label} ch${m.channel} ${m.data1}${midiKindInfo(m.kind).d2 ? "/" + m.data2 : ""}`).join(" · ");
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
  loadAudio: (fileId: string, outputId: string) => Promise<AudioBuffer>;
  needPro: (f: ProFeature) => boolean;
  channelCount: (outputId: string) => Promise<number>;
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
      <div className="grid grid-cols-2 gap-2">
        <Field label="Cue-nummer (fx 1, 1.5, 12.25)"><input className={inputCls} inputMode="decimal" placeholder="auto" value={cue.number ?? ""} onChange={(e) => set({ number: e.target.value.replace(",", ".").replace(/[^0-9.]/g, "") })} /></Field>
        <Field label="Manuskript-ref (side/replik)"><input className={inputCls} placeholder="fx s. 34" value={cue.ref ?? ""} onChange={(e) => set({ ref: e.target.value })} /></Field>
      </div>
      <Field label="Stikord (hvornår skal der trykkes GO?)"><input className={inputCls} placeholder="fx Efter guitarsolo" value={cue.stikord ?? ""} onChange={(e) => set({ stikord: e.target.value })} /></Field>

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
          {["#ef4444","#f59e0b","#eab308","#22c55e","#3b82f6","#a855f7","#ec4899"].map((col) => <button key={col} title="Vælg farve" onClick={() => set({ color: col })} className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: col }} />)}
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
          {cue.fileId && (
            <Field label="Waveform & trim (træk i markørerne)">
              <Waveform fileKey={cue.fileId} load={() => props.loadAudio(cue.fileId!, cue.outputId)} startTime={cue.startTime ?? 0} endTime={cue.endTime ?? 0} onChange={(p) => set(p)} />
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Field label="Start (s)"><Num value={cue.startTime ?? 0} step={0.05} min={0} onChange={(n) => set({ startTime: Math.max(0, n) })} /></Field>
                <Field label="Slut (s, 0 = filens slut)"><Num value={cue.endTime ?? 0} step={0.05} min={0} onChange={(n) => set({ endTime: Math.max(0, n) })} /></Field>
              </div>
              <div className="mt-1 flex gap-2">
                <Btn onClick={props.onFire}>▶ Afspil trim-udsnit</Btn>
                {(cue.startTime || cue.endTime) ? <button className="text-sm text-muted-foreground underline" onClick={() => set({ startTime: 0, endTime: 0 })}>Nulstil trim</button> : null}
              </div>
            </Field>
          )}
          {cue.fileId && <Field label="Forlyt (PFL) · Pro"><PflButton fileId={cue.fileId} allow={() => props.needPro("pfl")} /></Field>}
          <Field label="Lydudgang">
            <select className={inputCls} value={cue.outputId} onChange={(e) => set({ outputId: e.target.value })}>
              {outputs.map((o) => <option key={o.id} value={o.id}>{ioName(o.label, show.ioAliases?.audio?.[o.id])}</option>)}
              {!outputs.some((o) => o.id === cue.outputId) && <option value={cue.outputId}>(ukendt udgang – scan igen)</option>}
            </select>
          </Field>
          <ChannelPicker outputId={cue.outputId} channel={cue.channel ?? 1} mono={!!cue.mono} count={props.channelCount} aliases={show.ioAliases?.audio} onChange={(ch, mono) => { if ((ch > 1 || mono) && !props.needPro("channels")) return; set({ channel: ch, mono }); }} />
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
                  {midiPorts.map((p) => <option key={p} value={p}>{ioName(p, show.ioAliases?.midi?.[p])}</option>)}
                  {m.port && !midiPorts.includes(m.port) && <option value={m.port}>{m.port} (ikke tilsluttet)</option>}
                </select>
                {(() => { const k = midiKindInfo(m.kind); return (<>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  <select className={inputCls + " col-span-4"} value={m.kind} onChange={(e) => { const nk = midiKindInfo(e.target.value as MidiMsg["kind"]); upd({ kind: nk.kind, ...(nk.def1 != null ? { data1: nk.def1 } : {}) }); }}>
                    {MIDI_KINDS.map((x) => <option key={x.kind} value={x.kind}>{x.label}</option>)}
                  </select>
                  {k.channel && <input title="Kanal" type="number" min={1} max={16} className={inputCls} value={m.channel} onChange={(e) => upd({ channel: +e.target.value })} />}
                  {k.d1 && <input title={k.d1.label} type="number" min={0} max={k.d1.max} className={inputCls + (k.d1.max > 127 ? " col-span-2" : "")} value={m.data1} onChange={(e) => upd({ data1: +e.target.value })} />}
                  {k.d2 && <input title={k.d2.label} type="number" min={0} max={k.d2.max} className={inputCls} value={m.data2} onChange={(e) => upd({ data2: +e.target.value })} />}
                </div>
                <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
                  {k.channel && <span>Kanal</span>}{k.d1 && <span className={k.d1.max > 127 ? "col-span-2" : ""}>{k.d1.label}{k.d1.note ? ` (${noteName(m.data1)})` : ""}</span>}{k.d2 && <span>{k.d2.label}</span>}
                </div>
                </>); })()}
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
      {cue.type === "group" && <GroupEditor {...props} cue={cue} />}
      <MonitorNotes key={cue.id} cue={cue} monitors={show.monitors ?? []} onChange={onChange} />
    </div>
  );
}

function GroupEditor(props: Parameters<typeof Inspector>[0] & { cue: Extract<Cue, { type: "group" }> }) {
  const { cue, show, onChange } = props;
  const [sel, setSel] = useState<string | null>(cue.children[0]?.id ?? null);
  const setKids = (children: Cue[]) => onChange({ children } as Partial<Cue>);
  const upd = (id: string, p: Partial<Cue>) => setKids(cue.children.map((c) => (c.id === id ? ({ ...c, ...p } as Cue) : c)));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= cue.children.length) return; const a = [...cue.children]; [a[i], a[j]] = [a[j]!, a[i]!]; setKids(a); };
  const child = cue.children.find((c) => c.id === sel);
  return (
    <div className="rounded border-2 p-2" style={{ borderColor: cueColor(show, cue) }}>
      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-standby">Cues i gruppen · starter samtidig</div>
      <div className="flex flex-col gap-1">
        {cue.children.length === 0 && <div className="text-sm text-muted-foreground">Tom gruppe – tilføj cues nedenfor.</div>}
        {cue.children.map((c, i) => (
          <div key={c.id} className={`flex items-center gap-1 rounded border-l-4 px-2 py-1 text-sm ${sel === c.id ? "bg-accent" : "bg-secondary"}`} style={{ borderLeftColor: cueColor(show, c) }}>
            <button className="min-w-0 flex-1 truncate text-left font-semibold" onClick={() => setSel(c.id)}>{i + 1}. {c.name}{c.preWait ? ` · ⏱${c.preWait}s` : ""}</button>
            <button title="Op" onClick={() => move(i, -1)}>▲</button>
            <button title="Ned" onClick={() => move(i, 1)}>▼</button>
            <button title="Fjern" className="text-destructive" onClick={() => { setKids(cue.children.filter((x) => x.id !== c.id)); if (sel === c.id) setSel(null); }}>✕</button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {CHILD_TYPES.map((t) => (
          <button key={t} onClick={() => { const n = newCue(t); setKids([...cue.children, n]); setSel(n.id); }} className="rounded border-l-4 bg-secondary px-2 py-1 text-xs font-semibold hover:bg-accent" style={{ borderLeftColor: show.typeColors[t] || DEFAULT_TYPE_COLORS[t] }}>+ {TYPE_LABEL[t]}</button>
        ))}
      </div>
      {child && (
        <div className="mt-3 rounded border border-border p-2">
          <div className="mb-2 text-xs font-bold text-muted-foreground">Redigerer: {child.name} (Auto-follow ignoreres inde i en gruppe)</div>
          <Inspector
            {...props}
            key={child.id}
            cue={child}
            onChange={(p) => upd(child.id, p)}
            onDelete={() => { setKids(cue.children.filter((x) => x.id !== child.id)); setSel(null); }}
            onStandby={() => {}}
            onFile={async (f) => {
              const id = uid();
              await putAudio(id, f);
              upd(child.id, { fileId: id, fileName: f.name, name: child.name === "Lyd" ? f.name.replace(/\.[^.]+$/, "") : child.name } as Partial<Cue>);
            }}
          />
        </div>
      )}
    </div>
  );
}

function Settings(props: {
  show: Show; setShow: (s: Show) => void; midiPorts: string[]; midiIns: string[]; outputs: Output[]; onClose: () => void;
  onScanMidi: () => void; onScanAudio: () => void; onTestMidi: (port: string) => void;
}) {
  const { show, setShow } = props;
  const setAlias = (kind: "audio" | "midi", key: string, v: string) => {
    const cur = { ...(show.ioAliases?.[kind] ?? {}) };
    if (v) cur[key] = v; else delete cur[key];
    setShow({ ...show, ioAliases: { ...show.ioAliases, [kind]: cur } });
  };
  const aliasInput = (kind: "audio" | "midi", key: string) => (
    <input className="w-44 rounded border border-border bg-background px-2 py-1 text-sm" placeholder="Kaldenavn, fx Headphones" title="Dit eget navn for porten – gemmes i showet" value={show.ioAliases?.[kind]?.[key] ?? ""} onChange={(e) => setAlias(kind, key, e.target.value)} />
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6" onClick={props.onClose}>
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Indstillinger</h2>
          <Btn onClick={props.onClose}>Luk</Btn>
        </div>

        <div className="mb-5"><MonitorProfiles show={show} onChange={setShow} /></div>
        <Section title="MIDI-udgange" action={<Btn onClick={props.onScanMidi}>Scan</Btn>}>
          {props.midiPorts.length ? props.midiPorts.map((p) => (
            <div key={p} className="flex items-center justify-between gap-2 border-b border-border py-1.5">
              <span className="min-w-0 flex-1 truncate">{p}</span>
              {aliasInput("midi", p)}
              <button className="text-sm font-semibold text-go" onClick={() => props.onTestMidi(p)}>Test (Note 60 ch1)</button>
            </div>
          )) : <p className="text-sm text-muted-foreground">Ingen MIDI-porte fundet. Opret fx loopMIDI-porte på Windows og tryk Scan.</p>}
        </Section>

        <Section title="MIDI-indgange">
          {props.midiIns.length ? props.midiIns.map((p) => (
            <div key={p} className="flex items-center justify-between gap-2 border-b border-border py-1.5"><span className="min-w-0 flex-1 truncate">{p}</span>{aliasInput("midi", p)}</div>
          )) : <p className="text-sm text-muted-foreground">Ingen MIDI-indgange fundet.</p>}
        </Section>

        <Section title="Lydudgange" action={<Btn onClick={props.onScanAudio}>Scan enheder</Btn>}>
          {props.outputs.map((o) => <div key={o.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm"><span className="min-w-0 flex-1 truncate">{o.label}</span>{aliasInput("audio", o.id)}</div>)}
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
        <p className="text-xs text-muted-foreground">Lydfiler gemmes i browseren på denne computer. Show-filen (JSON) indeholder kun filnavne – på en ny computer skal lydfilerne vælges igen. Brug "Backup m. lyd" for at få alt med i én fil.</p>
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
  show: Show; flat: Cue[]; standby: Cue | null; standbyIdx: number; warn?: boolean;
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
          {standby.stikord && <div className={"mt-2 rounded px-3 py-2 text-3xl font-black text-standby " + (props.warn ? "animate-pulse bg-standby/40 ring-4 ring-standby" : "bg-standby/15")}>⏱ {standby.stikord}</div>}
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
      <p className="text-muted-foreground">Tryk "Lær" og aktivér en knap, pedal eller tangent på din MIDI-controller.</p>
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Luk">✕</button></div>
        {children}
      </div>
    </div>
  );
}

function SetlistImport({ onClose, onImport }: { onClose: () => void; onImport: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <Modal title="Importér setliste" onClose={onClose}>
      <p className="mb-2 text-sm text-muted-foreground">Indsæt én sang pr. linje. Numre foran (fx "1.") fjernes automatisk. Hver sang får et memo-cue, du kan bygge videre på.</p>
      <textarea autoFocus className="h-56 w-full rounded border border-border bg-input p-2 font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder={"1. Intro\n2. Første sang\n3. Ballade"} />
      <div className="mt-3 flex justify-end gap-2"><Btn onClick={onClose}>Annullér</Btn><button className="rounded bg-go px-4 py-1.5 font-bold text-go-foreground" onClick={() => onImport(text)}>Opret sange</button></div>
    </Modal>
  );
}

function PflButton({ fileId, allow }: { fileId: string; allow: () => boolean }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => () => { ref.current?.pause(); }, []);
  const toggle = async () => {
    if (on) { ref.current?.pause(); setOn(false); return; }
    if (!allow()) return;
    const blob = await getAudio(fileId);
    if (!blob) return;
    const a = new Audio(URL.createObjectURL(blob));
    ref.current = a;
    a.onended = () => setOn(false);
    await a.play();
    setOn(true);
  };
  return <button title="Lyt til filen i standard-udgangen (fx høretelefoner) uden at starte cuet" onClick={toggle} className={`rounded px-3 py-1.5 text-sm font-bold ${on ? "bg-standby text-background" : "bg-secondary"}`}>{on ? "⏹ Stop forlyt" : "🎧 Forlyt"}</button>;
}

function ChannelPicker({ outputId, channel, mono, count, aliases, onChange }: { outputId: string; channel: number; mono: boolean; count: (o: string) => Promise<number>; aliases?: Record<string, string> | undefined; onChange: (ch: number, mono: boolean) => void }) {
  const [n, setN] = useState(2);
  useEffect(() => { count(outputId).then(setN).catch(() => setN(2)); }, [outputId, count]);
  const max = Math.max(n, channel + (mono ? 0 : 1));
  const name = (c: number) => aliases?.[`${outputId}#${c}`]?.trim() || `Ch ${c}`;
  const opts = mono ? Array.from({ length: max }, (_, i) => i + 1) : Array.from({ length: Math.floor(max / 2) }, (_, i) => i * 2 + 1);
  return (
    <Field label={`Kanaler (${n} fundet${n > 2 ? "" : " – tilslut lydkort med flere udgange"}) · Pro over 1/2`}>
      <div className="flex gap-2">
        <select className={inputCls} value={channel} onChange={(e) => onChange(+e.target.value, mono)}>
          {opts.map((c) => <option key={c} value={c}>{mono ? name(c) : `${name(c)} / ${name(c + 1)}`}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={mono} onChange={(e) => onChange(e.target.checked ? channel : channel % 2 ? channel : channel - 1, e.target.checked)} />Mono</label>
      </div>
    </Field>
  );
}

function ShortcutManager({ map, onChange, onClose }: { map: ShortcutMap; onChange: (m: ShortcutMap) => void; onClose: () => void }) {
  const [capture, setCapture] = useState<ShortcutAction | null>(null);
  useEffect(() => {
    if (!capture) return;
    const h = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
      if (e.code === "Backspace" || e.code === "Delete") onChange(assign(map, capture, null));
      else if (e.code !== "Escape") onChange(assign(map, capture, comboOf(e)));
      setCapture(null);
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [capture, map, onChange]);
  return (
    <Modal title="Genvejs-manager" onClose={onClose}>
      <p className="mb-3 text-sm text-muted-foreground">Klik på en genvej og tryk den tast (eller kombination) du vil bruge. Backspace fjerner den. Enkelt-taster virker ikke mens du skriver i et felt.</p>
      <div data-shortcut-capture className="grid max-h-[60vh] grid-cols-[1fr_auto] gap-x-6 gap-y-1 overflow-auto">
        {(Object.keys(SHORTCUT_LABEL) as ShortcutAction[]).map((a) => (
          <Fragment key={a}>
            <span className="py-1">{SHORTCUT_LABEL[a]}</span>
            <button onClick={() => setCapture(a)} className={`min-w-28 rounded border px-2 py-1 font-mono text-sm ${capture === a ? "border-standby bg-standby/20 text-standby" : "border-border bg-secondary"}`}>{capture === a ? "Tryk en tast…" : prettyCombo(map[a])}</button>
          </Fragment>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button onClick={() => onChange({ ...DEFAULT_SHORTCUTS })} className="rounded bg-secondary px-3 py-1.5 text-sm">Nulstil til standard</button>
        <span className="text-sm text-muted-foreground">MIDI-controllere sættes op i vinduet "MIDI-controller".</span>
      </div>
    </Modal>
  );
}
