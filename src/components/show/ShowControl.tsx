import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { loadShow, saveShow, cloudSyncOn, setCloudSync } from "@/lib/show/localShows";
import { rememberHandle, recallHandle, canWrite } from "@/lib/show/fileHandles";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { OSC_TEMPLATES, sendOsc, isVirtualMidi } from "@/lib/show/osc";
import { Engine, listAudioOutputs, type ActiveRow } from "@/lib/show/engine";
import { putAudio, getAudio } from "@/lib/show/audioStore";
import { downloadBlob, renderClickVideo, safeName } from "@/lib/show/clickExport";
import { collectFileIds, packArchive, unpackArchive } from "@/lib/show/archive";
import { AUDIO_DIR, SHOW_FILE, audioRefs, diskNames, matchFiles, type AudioRef } from "@/lib/show/projectFolder";
import {
  DEFAULT_TYPE_COLORS, TYPE_LABEL, cueColor, emptyShow, flatten, fmt, fmtTime, moveCue, moveSong, insertCue, shiftCue,
  newCue, cueAsDefault, newMidiMsg, MIDI_KINDS, midiKindInfo, noteName, nextStandbyIndex, parseShow, uid,
} from "@/lib/show/logic";
import type { Cue, CueType, MidiKind, MidiMsg, Show } from "@/lib/show/types";
import { ioName } from "@/lib/show/types";
import { isSlot, numberExisting, resolveOut, slotLabel, slotNum, slotRef, slots, type PatchKind, type PatchSlot } from "@/lib/show/patch";
import { RemoteHost } from "./RemoteHost";
import { FindReplace } from "./FindReplace";
import { MonitorNotes } from "./MonitorNotes";
import { MonitorProfiles } from "./MonitorProfiles";
import type { RemoteCmd, RemoteState } from "@/lib/show/remote";
import { FloatingWindow, type WinState } from "./FloatingWindow";
import { Waveform } from "./Waveform";
import { MenuBar, type Menu } from "./MenuBar";
import { CommandPalette } from "./CommandPalette";
import { monitorFields, revealedAt } from "@/lib/show/monitors";
import { GRID, snapRect, type SnapMode } from "@/lib/show/snap";
import { TAB_TUNINGS, tabTemplate } from "@/lib/show/tabs";
import { COLS, DEFAULT_VIEW, applyTips, gridCols, loadView, saveView, type ColKey, type ViewPrefs } from "@/lib/show/view";
import { ClickGenerator } from "./ClickGenerator";
import { TimecodePanel } from "./TimecodePanel";
import { CartPanel } from "./CartPanel";
import { DmxCueEditor, DmxMonitor, DmxSettingsSection } from "./DmxPanel";
import { dmx } from "@/lib/show/dmx";
import type { AudioCue, CartPad } from "@/lib/show/types";
import { ProDialog } from "./ProGate";
import { HotStandby } from "./HotStandby";
import { DEFAULT_GO_GUARD_MS, acceptGo, isDoubleTap, readPlayhead, savePlayhead, shouldOfferResume, type Playhead } from "@/lib/show/safety";
import { usePlan } from "@/lib/show/usePlan";
import { hasPro, type ProFeature } from "@/lib/show/plan";
import { SHORTCUT_LABEL, assign, comboOf, findAction, loadShortcuts, prettyCombo, saveShortcuts, DEFAULT_SHORTCUTS, type ShortcutAction, type ShortcutMap } from "@/lib/show/shortcuts";
import { MidiMonitor, type MidiLogRow } from "./MidiMonitor";
import { trackFeature } from "@/lib/track";
import { setAppLang, useAppLang, trApp, useTrApp } from "@/lib/show/appI18n";
import { diagShort, diagUi, explain, type Diag } from "@/lib/show/diagnose";
import { HelpTips } from "@/components/show/HelpTips";
import { preflight, type PreflightIssue } from "@/lib/show/preflight";
import { LANGS, LANG_NAMES } from "@/lib/site/i18n";
import { PEDAL_LABEL, matchPedal, midiInLabel, parseMidiIn, type MidiIn, type PedalAction, type PedalMap } from "@/lib/show/pedal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CueWizard } from "./CueWizard";
import { readWorkspaceMode, saveGuidedCue, type WorkspaceMode } from "@/lib/show/workspace";

type WinKey = "stage" | "transport" | "list" | "inspector" | "pedal" | "remote" | "midimon" | "cart" | "dmx";
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
  cart: { x: 384, y: 454, w: 620, h: 420, z: 1, open: false, min: false },
  dmx: { x: 420, y: 120, w: 720, h: 560, z: 1, open: false, min: false },
});
const simpleWins = (): Record<WinKey, WinState> => {
  const d = defaultWins();
  for (const k of Object.keys(d) as WinKey[]) d[k].open = k === "stage" || k === "transport" || k === "list";
  d.list = { ...d.list, w: 760, h: 912 };
  return d;
};
const WIN_TITLES: Record<WinKey, string> = { stage: "Scene", transport: "Transport", list: "Setliste", inspector: "Inspector", pedal: "MIDI-controller", remote: "Telefon", midimon: "MIDI Monitor", cart: "Lydbræt (jingles)", dmx: "DMX Monitor" };

const TYPES: CueType[] = ["audio", "midi", "osc", "fade", "stop", "pause", "wait", "memo", "dmx", "group"];
const CHILD_TYPES: CueType[] = ["audio", "midi", "osc", "fade", "stop", "pause", "wait", "memo", "dmx"];

type Output = { id: string; label: string };

export function ShowControl({ showId }: { showId: string }) {
  const navigate = useNavigate();
  const lang = useAppLang();
  const tr = (x: string) => trApp(x, lang);
  const engineRef = useRef<Engine | null>(null);
  const [show, setShow] = useState<Show>(emptyShow);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<"ok" | "saving" | "error">("ok");
  const [standbyId, setStandbyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [midiPorts, setMidiPorts] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<Output[]>([{ id: "", label: "Standard udgang" }]);
  const [settings, setSettings] = useState(false);
  const [clock, setClock] = useState("");
  const [lastGo, setLastGo] = useState<number | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [wins, setWins] = useState(defaultWins);
  const [snap, setSnapMode] = useState<SnapMode>("free");
  useEffect(() => { const m = localStorage.getItem("stagecue.snap"); if (m) setSnapMode(m as SnapMode); }, []);
  const [songQuery, setSongQuery] = useState("");
  const [noteSize, setNoteSize] = useState<0 | 1 | 2>(1);
  const [pedals, setPedals] = useState<PedalMap>({});
  const [learning, setLearning] = useState<PedalAction | null>(null);
  const [lastMidi, setLastMidi] = useState<MidiIn | null>(null);
  const [locked, setLocked] = useState(false);
  const [mode, setMode] = useState<WorkspaceMode>("pro");
  const guided = mode === "theatre";
  const [guide, setGuide] = useState<{ cue: Cue | null; editing: boolean; sceneId: string } | null>(null);
  const [sceneOpen, setSceneOpen] = useState(false);
  const [sceneName, setSceneName] = useState("");
  useEffect(() => { setMode(readWorkspaceMode(localStorage.getItem("stagecue.workspace"))); }, []);
  const changeMode = (m: WorkspaceMode) => { setMode(m); localStorage.setItem("stagecue.workspace", m); };
  const workspaceState = (k: WinKey): WinState => guided && ["stage", "transport", "list"].includes(k) ? { ...wins[k], open: true, min: false, popped: false } : guided && k === "inspector" ? { ...wins[k], open: false } : wins[k];
  const plan = usePlan();
  const pro = hasPro(plan.tier);
  useEffect(() => { if (!plan.loading && !pro) setCloudSync(false); }, [plan.loading, pro]);
  const [proAsk, setProAsk] = useState<ProFeature | null>(null);
  const needPro = useCallback((f: ProFeature) => { if (pro) return true; setProAsk(f); return false; }, [pro]);
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(DEFAULT_SHORTCUTS);
  useEffect(() => setShortcuts(loadShortcuts()), []);
  const scRef = useRef<{ map: ShortcutMap; add: (t: CueType) => void; mute: () => void; stop: () => void; save: () => void; backup: () => void; open: () => void; shift?: (d: -1 | 1) => void; findReplace?: () => void; toggleLock?: () => void }>({ map: DEFAULT_SHORTCUTS, add: () => {}, mute: () => {}, stop: () => {}, save: () => {}, backup: () => {}, open: () => {} });
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
  const setWin = (k: WinKey, p: Partial<WinState>) => setWins((w) => {
    let next = { ...w[k], ...p };
    if (snap !== "free" && ("x" in p || "w" in p)) {
      const others = (Object.keys(w) as WinKey[]).filter((o) => o !== k && w[o].open).map((o) => w[o]);
      next = { ...next, ...snapRect(next, others, snap, { w: window.innerWidth, h: window.innerHeight }, "w" in p) };
    }
    return { ...w, [k]: next };
  });
  const focusWin = (k: WinKey) =>
    setWins((w) => {
      const top = Math.max(...Object.values(w).map((x) => x.z));
      return w[k].z === top ? w : { ...w, [k]: { ...w[k], z: top + 1 } };
    });
  const applyLayout = (sh: Show) => {
    const l = sh.layout;
    if (!l) return;
    if (l.wins) { const j = JSON.parse(JSON.stringify(l.wins)) as Record<string, WinState>; for (const k in j) if (j[k]) j[k].popped = false; setWins({ ...defaultWins(), ...(j as Partial<Record<WinKey, WinState>>) }); }
    if (l.snap) setSnapMode(l.snap as SnapMode);
    if (typeof l.goGuard === "number") setGoGuard(l.goGuard);
    if (l.timeMode === "none" || l.timeMode === "elapsed" || l.timeMode === "lastgo") setTimeMode(l.timeMode);
    if (l.timeFmt === "hms" || l.timeFmt === "sec") setTimeFmt(l.timeFmt);
    if (l.noteSize === 0 || l.noteSize === 1 || l.noteSize === 2) setNoteSize(l.noteSize);
    if (l.pedals) setPedals(l.pedals as typeof pedals);
  };
  const changeSnap = (m: SnapMode) => {
    setSnapMode(m);
    localStorage.setItem("stagecue.snap", m);
    if (m === "grid" || m === "both") setWins((w) => {
      const n = { ...w };
      for (const k of Object.keys(n) as WinKey[]) { const g = (v: number) => Math.round(v / GRID) * GRID; n[k] = { ...n[k], x: g(n[k].x), y: g(n[k].y), w: Math.max(GRID * 11, g(n[k].w)), h: Math.max(GRID * 6, g(n[k].h)) }; }
      return n;
    });
  };
  useEffect(() => {
    try {
      const w = localStorage.getItem(WIN_KEY);
      if (w) { const j = JSON.parse(w); for (const k in j) if (j[k]) j[k].popped = false; setWins({ ...defaultWins(), ...j }); }
      const p = localStorage.getItem(PEDAL_KEY);
      if (p) setPedals(JSON.parse(p));
      const n = localStorage.getItem("stagecue.notesize");
      if (n) setNoteSize(Number(n) as 0 | 1 | 2);
    } catch {}
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(WIN_KEY, JSON.stringify(wins)); }, [wins, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem(PEDAL_KEY, JSON.stringify(pedals)); }, [pedals, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem("stagecue.notesize", String(noteSize)); }, [noteSize, loaded]);

  const patchRef = useRef<{ show: Show; outputs: Output[] }>({ show: emptyShow(), outputs: [] });
  patchRef.current = { show, outputs };
  const engine = () => {
    if (!engineRef.current) {
      engineRef.current = new Engine();
      engineRef.current.onError = (m) => setError(m);
      dmx.onError = (m) => setError(m);
      engineRef.current.onMidiLog = (dir, port, bytes) => {
        if (monPausedRef.current) return;
        const row = { id: ++logId.current, t: Date.now(), dir, port, bytes };
        setMidiLog((l) => [row, ...l].slice(0, 300));
      };
      engineRef.current.onMidiPorts = (outs, ins) => { setMidiPorts(outs); setMidiIns(ins); };
      engineRef.current.resolveAudio = (id) => resolveOut(patchRef.current.show, "audio", id || patchRef.current.show.paOut || "", patchRef.current.outputs);
      engineRef.current.resolveMidi = (p) => resolveOut(patchRef.current.show, "midi", p);
    }
    return engineRef.current;
  };

  const withLayout = (): Show => ({ ...show, layout: { wins: Object.fromEntries(Object.entries(wins).map(([k, v]) => [k, { ...v, popped: false }])), snap, goGuard, timeMode, timeFmt, noteSize, pedals } });
  const flat = useMemo(() => flatten(show), [show]);
  useEffect(() => { dmx.configure(show.dmx); }, [show.dmx]);
  const standbyIdx = flat.findIndex((c) => c.id === standbyId);
  const standby = standbyIdx >= 0 ? flat[standbyIdx] : null;
  const selected = flat.find((c) => c.id === selectedId) ?? null;

  // load + autosave
  useEffect(() => {
    loadShow(showId).then((data) => {
      if (!data) { setError("Kunne ikke hente show: ikke fundet"); return; }
      try { const sh = parseShow(JSON.stringify({ ...emptyShow(), ...(data.data as object), name: data.name })); setShow(sh); applyLayout(sh); } catch { setShow({ ...emptyShow(), name: data.name }); }
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
  const diags = useMemo(() => {
    const w: Diag[] = [];
    for (const i of seenIns.current) if (!midiIns.includes(i)) w.push({ code: "midiInGone", slot: i, hw: i });
    const outsUsed = new Set<string>(), audioUsed = new Set<string>();
    const users = new Map<string, string[]>();
    const addUser = (k: string, id: string) => { const l = users.get(k) ?? []; if (!l.includes(id)) l.push(id); users.set(k, l); };
    flat.forEach((c) => {
      if (c.type === "midi") c.messages.forEach((m) => { if (m.port) { outsUsed.add(m.port); addUser("m" + m.port, c.id); } });
      if (c.type === "audio" && c.outputId) { audioUsed.add(c.outputId); addUser("a" + c.outputId, c.id); }
    });
    const midiName = (p: string) => (isSlot(p) ? `MIDI ${slotNum(p)}` : p);
    if (midiPorts.length || midiIns.length || seenIns.current.size) for (const p of outsUsed) {
      const hw = resolveOut(show, "midi", p);
      if (!hw || isSlot(hw)) w.push({ code: "midiOutUnassigned", slot: midiName(p), cues: users.get("m" + p) });
      else if (!midiPorts.includes(hw)) w.push({ code: "midiOutGone", slot: midiName(p), hw, cues: users.get("m" + p) });
    }
    if (outputs.length > 1) for (const a of audioUsed) {
      const hw = resolveOut(show, "audio", a, outputs);
      if (hw && !outputs.some((o) => o.id === hw)) w.push({ code: "audioOutGone", slot: isSlot(a) ? `Lyd ${slotNum(a)}` : "Lyd-cue", cues: users.get("a" + a) });
    }
    return w.filter((d, i) => w.findIndex((x) => x.code === d.code && x.slot === d.slot) === i);
  }, [midiIns, midiPorts, outputs, flat, show.patch]);
  const warnings = useMemo(() => diags.map((d) => diagShort(d, "da")), [diags]);
  const [diagOpen, setDiagOpen] = useState(false);
  // Dismissed warnings stay hidden while the problem persists; once it is gone the key is forgotten, so it shows again if it returns.
  const [dismissed, setDismissed] = useState<string[]>([]);
  const dKey = (d: Diag) => d.code + "|" + d.slot;
  useEffect(() => { setDismissed((x) => { const live = x.filter((k) => diags.some((d) => dKey(d) === k)); return live.length === x.length ? x : live; }); }, [diags]);
  const shownDiags = diags.filter((d) => !dismissed.includes(dKey(d)));
  const goToCue = (id: string) => {
    setDiagOpen(false); setSelectedId(id);
    const song = show.songs.find((sg) => sg.cues.some((c) => c.id === id || (c.type === "group" && c.children.some((k) => k.id === id))));
    if (song) setSelectedSongId(song.id);
    setTimeout(() => document.querySelector(`[data-cue-id="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
  };
  const [pf, setPf] = useState<PreflightIssue[] | null>(null);
  const runPreflight = async () => { await checkMissing(); const miss: string[] = []; for (const r of audioRefs(show)) if (!(await getAudio(r.fileId))) miss.push(r.fileId); setPf(preflight(show, miss)); };
  const toggleLock = () => { if (!locked) void runPreflight(); setLocked((l) => !l); };
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
      const ok = await saveShow(showId, show.name, withLayout());
      setSaved(ok ? "ok" : "error");
    }, 700);
    return () => clearTimeout(t);
  }, [show, loaded, wins, snap]);
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

  const [goGuard, setGoGuard] = useState(DEFAULT_GO_GUARD_MS);
  useEffect(() => { const g = localStorage.getItem("stagecue.goguard"); if (g !== null) setGoGuard(Number(g)); }, []);
  const [timeMode, setTimeMode] = useState<"none" | "elapsed" | "lastgo">("elapsed");
  useEffect(() => { const m = localStorage.getItem("stagecue.timebox"); if (m === "none" || m === "elapsed" || m === "lastgo") setTimeMode(m); }, []);
  const [timeFmt, setTimeFmt] = useState<"hms" | "sec">("hms");
  useEffect(() => { const f = localStorage.getItem("stagecue.timefmt"); if (f === "hms" || f === "sec") setTimeFmt(f); }, []);
  const [backup, setBackup] = useState(false);
  const [resume, setResume] = useState<Playhead | null>(null);
  const lastGoAt = useRef<number | null>(null);
  const lastEsc = useRef<number | null>(null);
  const go = useCallback(() => {
    if (standbyIdx < 0 || backup) return;
    const t = performance.now();
    if (!acceptGo(lastGoAt.current, t, goGuard)) return;
    trackFeature("pult.go", true);
    lastGoAt.current = t;
    engine().go(flat, standbyIdx);
    setLiveId(flat[standbyIdx]!.id);
    setLastGo(performance.now());
    const n = nextStandbyIndex(flat, standbyIdx);
    setStandbyId(n >= 0 ? flat[n]!.id : null);
  }, [flat, standbyIdx, backup, goGuard]);

  /** Timecode trigger: fire a specific cue as if it were on standby. */
  const fireById = (id: string) => {
    const i = flat.findIndex((c) => c.id === id);
    if (i < 0 || backup) return;
    engine().go(flat, i);
    setLiveId(id);
    setLastGo(performance.now());
    const n = nextStandbyIndex(flat, i);
    setStandbyId(n >= 0 ? flat[n]!.id : null);
  };

  // Esc = smooth emergency fade; Esc twice quickly = instant hard cut.
  const panic = useCallback(() => {
    const t = performance.now();
    engine().panic(isDoubleTap(lastEsc.current, t) ? 0 : show.panicFade);
    lastEsc.current = t;
  }, [show.panicFade]);

  // Crash recovery: remember the playhead; offer to resume after an unclean exit.
  useEffect(() => {
    if (!loaded) return;
    const p = readPlayhead(showId);
    if (shouldOfferResume(p, Date.now()) && flat.some((c) => c.id === p.standbyId)) setResume(p);
    const bye = () => { const q = readPlayhead(showId); if (q) savePlayhead(showId, { ...q, clean: true }); };
    window.addEventListener("pagehide", bye);
    return () => { window.removeEventListener("pagehide", bye); bye(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, showId]);
  useEffect(() => {
    if (!loaded || resume) return;
    const c = flat.find((x) => x.id === standbyId);
    savePlayhead(showId, { standbyId, label: c ? `${c.number ? c.number + " · " : ""}${c.name}` : "", t: Date.now(), clean: false });
  }, [standbyId, loaded, showId, flat, resume]);
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
      if (document.querySelector('[data-cue-guide="true"]')) return;
      if (t.closest("[data-shortcut-capture]")) return;
      if (e.altKey && !e.ctrlKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); scRef.current.shift?.(e.key === "ArrowUp" ? -1 : 1); return; }
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "s") { e.preventDefault(); if (e.shiftKey) scRef.current.backup(); else scRef.current.save(); return; }
        if (key === "o") { e.preventDefault(); scRef.current.open(); return; }
        if (key === "h") { e.preventDefault(); scRef.current.findReplace?.(); return; }
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
      else if (a === "lock") scRef.current.toggleLock?.();
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
  scRef.current.shift = (d: -1 | 1) => { if (!locked && selectedId) setShow((s) => shiftCue(s, selectedId, d)); };
  const addCue = (type: CueType) => {
    if (locked) return;
    if (type === "group" && !needPro("group")) return;
    if (guided) {
      const sceneId = selectedSongId ?? show.songs.find((s) => s.cues.some((c) => c.id === selectedId))?.id ?? show.songs[0]?.id;
      if (!sceneId) { setSceneName(`Akt/Scene ${show.songs.length + 1}`); setSceneOpen(true); return; }
      setGuide({ cue: newCue(type, show.cueDefaults), editing: false, sceneId }); return;
    }
    const c = newCue(type, show.cueDefaults);
    trackFeature(`cue.${type}`);
    setShow((s) => insertCue(s, c, selectedId, selectedSongId));
    setStandbyId(c.id);
    setSelectedId(c.id);
  };
  const [clickOpen, setClickOpen] = useState(false);
  const [tcOpen, setTcOpen] = useState(false);
  const AUDIO_EXT = /\.(mp3|wav|aiff?|flac|m4a|ogg|aac|opus)$/i;
  const [fileDrop, setFileDrop] = useState<string | null>(null);
  const isFileDrag = (e: import("react").DragEvent) => !drag.current && Array.from(e.dataTransfer.types).includes("Files");
  /** Audio files dragged in from Explorer become audio cues in the song they land on. */
  const dropFiles = async (files: File[], songId: string | null, beforeId: string | null) => {
    setFileDrop(null);
    if (locked) return;
    const audio = files.filter((f) => f.type.startsWith("audio/") || AUDIO_EXT.test(f.name));
    if (!audio.length) { setError(tr("Kun lydfiler (mp3, wav, aiff, flac, m4a) kan trækkes ind")); return; }
    const made: Cue[] = [];
    for (const f of audio) {
      const id = uid();
      await putAudio(id, f);
      made.push({ ...newCue("audio", show.cueDefaults), name: f.name.replace(/\.[^.]+$/, ""), fileId: id, fileName: f.name } as Cue);
    }
    trackFeature("cue.dropFiles");
    setShow((s) => {
      const songs = [...s.songs];
      let si = songs.findIndex((sg) => sg.id === songId);
      if (si < 0) { if (!songs.length) return { ...s, songs: [{ id: uid(), name: "Sang 1", cues: made }] }; si = songs.length - 1; }
      const cues = [...songs[si]!.cues];
      const at = beforeId ? cues.findIndex((x) => x.id === beforeId) : -1;
      cues.splice(at < 0 ? cues.length : at, 0, ...made);
      songs[si] = { ...songs[si]!, cues };
      return { ...s, songs };
    });
    setSelectedId(made[0]!.id);
  };
  const [keysOpen, setKeysOpen] = useState(false);
  const [frOpen, setFrOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const importSetlist = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*\d+[.)\-:]?\s*/, "").trim()).filter(Boolean);
    if (!lines.length) return;
    setShow((s) => ({ ...s, songs: [...s.songs, ...lines.map((name) => ({ id: uid(), name, cues: [{ ...newCue("memo"), name } as Cue] }))] }));
    setImportOpen(false);
  };
  const createClickCue = async (blob: Blob, name: string, click?: Cue["click"]) => {
    const id = uid();
    await putAudio(id, blob);
    const c = { ...newCue("audio"), name, fileId: id, fileName: `${name}.wav`, ...(click ? { click } : {}) } as Cue;
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
  const addSong = () => {
    if (locked) return;
    if (guided) { setSceneName(`Akt/Scene ${show.songs.length + 1}`); setSceneOpen(true); return; }
    setShow((s) => ({ ...s, songs: [...s.songs, { id: uid(), name: `Sang ${s.songs.length + 1}`, cues: [] }] }));
  };
  const renameSong = (id: string, name: string) => setShow((s) => ({ ...s, songs: s.songs.map((sg) => (sg.id === id ? { ...sg, name } : sg)) }));
  const deleteSong = (id: string) => {
    if (!confirm(tr("Slet sang og alle dens cues?"))) return;
    setShow((s) => ({ ...s, songs: s.songs.filter((sg) => sg.id !== id) }));
  };

  // file io
  const fileRef = useRef<HTMLInputElement>(null);
  const fileHandle = useRef<any>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSavedAt, setFileSavedAt] = useState<string | null>(null);
  const [autoSaveMin, setAutoSaveMin] = useState(0);
  useEffect(() => { const n = Number(localStorage.getItem("stagecue.autosave")); if (n > 0) setAutoSaveMin(n); }, []);
  const projectDir = useRef<any>(null);
  const [missing, setMissing] = useState<AudioRef[]>([]);
  const [relinkMsg, setRelinkMsg] = useState<string | null>(null);
  const refsKey = useMemo(() => audioRefs(show).map((r) => r.fileId).join(","), [show]);
  const checkMissing = useCallback(async () => {
    const out: AudioRef[] = [];
    for (const r of audioRefs(show)) if (!(await getAudio(r.fileId))) out.push(r);
    setMissing(out);
  }, [refsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (loaded) void checkMissing(); }, [loaded, checkMissing]);
  /** List audio files in a folder and its sub-folders (any language's folder name). */
  const scanDir = async (dir: any, depth = 0): Promise<{ name: string; get: () => Promise<Blob> }[]> => {
    const out: { name: string; get: () => Promise<Blob> }[] = [];
    for await (const [name, h] of dir.entries()) {
      if (h.kind === "file" && /\.(wav|mp3|aiff?|flac|ogg|m4a|aac)$/i.test(name)) out.push({ name, get: () => h.getFile() });
      else if (h.kind === "directory" && depth < 3) out.push(...(await scanDir(h, depth + 1)));
    }
    return out;
  };
  const loadMissingFrom = async (files: { name: string; get: () => Promise<Blob> }[], s: Show, need: AudioRef[]) => {
    const hits = matchFiles(need, files, s.audioFiles);
    for (const [id, f] of Object.entries(hits)) await putAudio(id, await f.get());
    return Object.keys(hits).length;
  };
  /** Write any audio files the project folder doesn't have yet; returns updated name map. */
  const syncFolder = async (dir: any, s: Show) => {
    const refs = audioRefs(s);
    const names = { ...diskNames(refs), ...(s.audioFiles ?? {}) };
    const existing = Object.values(s.audioFiles ?? {}).map((n) => n.toLowerCase());
    let audioDir: any = null;
    for (const n of [...new Set([...Object.values(AUDIO_DIR)])]) { try { audioDir = await dir.getDirectoryHandle(n); break; } catch { /* næste */ } }
    if (!audioDir) audioDir = await dir.getDirectoryHandle(AUDIO_DIR[lang], { create: true });
    const fresh = diskNames(refs.filter((r) => !s.audioFiles?.[r.fileId]).map((r) => ({ ...r, fileName: existing.includes(r.fileName.toLowerCase()) ? `${r.fileId}_${r.fileName}` : r.fileName })));
    Object.assign(names, fresh);
    for (const r of refs) {
      const b = await getAudio(r.fileId); if (!b) continue;
      const name = names[r.fileId]!;
      try { await audioDir.getFileHandle(name); continue; } catch { /* mangler – skriv */ }
      const fh = await audioDir.getFileHandle(name, { create: true }); const w = await fh.createWritable(); await w.write(b); await w.close();
    }
    const map: Record<string, string> = {}; for (const r of refs) map[r.fileId] = names[r.fileId]!;
    return map;
  };
  const saveAsFolder = async () => {
    const picker = (window as any).showDirectoryPicker;
    if (!picker) { setError("Din browser kan ikke gemme mapper – brug Windows-appen, Chrome eller Edge."); return; }
    try {
      const parent = await picker({ mode: "readwrite" });
      const dir = await parent.getDirectoryHandle(show.name.replace(/[\\/:*?"<>|]/g, "").trim() || "Show", { create: true });
      const audioFiles = await syncFolder(dir, show);
      const next = { ...show, audioFiles }; setShow(next);
      const h = await dir.getFileHandle(SHOW_FILE, { create: true });
      const w = await h.createWritable(); await w.write(JSON.stringify({ ...withLayout(), audioFiles }, null, 2)); await w.close();
      projectDir.current = dir; fileHandle.current = h; setFileName(`${dir.name}/${SHOW_FILE}`); void rememberHandle(showId, { file: h, dir });
      setFileSavedAt(`Gemt kl. ${new Date().toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`);
    } catch (e) { if ((e as Error).name !== "AbortError") setError("Kunne ikke gemme mappen: " + (e as Error).message); }
  };
  const openFolder = async () => {
    const picker = (window as any).showDirectoryPicker;
    if (!picker) { setError("Din browser kan ikke åbne mapper – brug Windows-appen, Chrome eller Edge."); return; }
    try {
      const dir = await picker({ mode: "readwrite" });
      let h: any = null;
      try { h = await dir.getFileHandle(SHOW_FILE); } catch { for await (const [n, x] of dir.entries()) if (x.kind === "file" && n.endsWith(".stagecue.json")) { h = x; break; } }
      if (!h) { setError(`Fandt ingen showfil (${SHOW_FILE}) i mappen.`); return; }
      const s = parseShow(await (await h.getFile()).text());
      const need: AudioRef[] = []; for (const r of audioRefs(s)) if (!(await getAudio(r.fileId))) need.push(r);
      const n = need.length ? await loadMissingFrom(await scanDir(dir), s, need) : 0;
      engine().panic(0); setShow(s); applyLayout(s); setStandbyId(null); setSelectedId(null);
      projectDir.current = dir; fileHandle.current = h; setFileName(`${dir.name}/${h.name}`); void rememberHandle(showId, { file: h, dir });
      if (need.length) setRelinkMsg(n === need.length ? `✓ ${n} lydfiler indlæst fra mappen` : `${n} af ${need.length} lydfiler fundet i mappen`);
    } catch (e) { if ((e as Error).name !== "AbortError") setError("Kunne ikke åbne mappen: " + (e as Error).message); }
  };
  const relinkInput = useRef<HTMLInputElement>(null);
  const relinkFiles = async (files: { name: string; get: () => Promise<Blob> }[]) => {
    const need = missing; const n = await loadMissingFrom(files, show, need);
    await checkMissing();
    setRelinkMsg(n === need.length ? `✓ ${n} lydfiler genfundet og klar til afspilning` : `${n} af ${need.length} lydfiler fundet – vælg en anden mappe for resten`);
  };
  const relink = async () => {
    const picker = (window as any).showDirectoryPicker;
    if (!picker) { relinkInput.current?.click(); return; }
    try { await relinkFiles(await scanDir(await picker())); } catch (e) { if ((e as Error).name !== "AbortError") setError((e as Error).message); }
  };
  const writeToHandle = async (auto = false) => {
    const h = fileHandle.current; if (!h) return false;
    try {
      if (!(await canWrite(projectDir.current ?? h))) { if (!auto) setError("StageCue fik ikke lov til at skrive i filen – prøv Gem som…"); return false; }
      if (projectDir.current) {
        const audioFiles = await syncFolder(projectDir.current, show);
        setShow((s) => ({ ...s, audioFiles }));
        const w = await h.createWritable(); await w.write(JSON.stringify({ ...withLayout(), audioFiles }, null, 2)); await w.close();
        setFileSavedAt(`${auto ? "Auto-gemt" : "Gemt"} kl. ${new Date().toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`);
        return true;
      }
      const w = await h.createWritable();
      await w.write(JSON.stringify(withLayout(), null, 2));
      await w.close();
      setFileSavedAt(`${auto ? "Auto-gemt" : "Gemt"} kl. ${new Date().toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`);
      return true;
    } catch (e) { setError("Kunne ikke gemme filen: " + (e as Error).message); return false; }
  };
  const saveAs = async () => {
    const picker = (window as any).showSaveFilePicker;
    if (!picker) { downloadShow(); return; }
    try {
      const h = await picker({ suggestedName: `${show.name.replace(/[^\wæøåÆØÅ -]/g, "") || "show"}.stagecue.json`, types: [{ description: "StageCue show", accept: { "application/json": [".json"] } }] });
      fileHandle.current = h; projectDir.current = null; setFileName(h.name); void rememberHandle(showId, { file: h, dir: null });
      await writeToHandle();
    } catch { /* annulleret */ }
  };
  useEffect(() => {
    void recallHandle(showId).then((v) => {
      if (!v?.file) return;
      fileHandle.current = v.file; projectDir.current = v.dir ?? null;
      setFileName(v.dir ? `${v.dir.name}/${v.file.name}` : v.file.name);
    });
  }, [showId]);
  const exportShow = () => { if (fileHandle.current) void writeToHandle(); else void saveAs(); };
  const autoRef = useRef(writeToHandle); autoRef.current = writeToHandle;
  useEffect(() => {
    if (!autoSaveMin) return;
    const t = setInterval(() => { void autoRef.current(true); }, autoSaveMin * 60000);
    return () => clearInterval(t);
  }, [autoSaveMin]);
  const downloadShow = () => {
    const blob = new Blob([JSON.stringify(withLayout(), null, 2)], { type: "application/json" });
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
    const blob = new Blob([packArchive(withLayout(), audio) as BlobPart], { type: "application/zip" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${show.name.replace(/[^\wæøåÆØÅ -]/g, "") || "show"}.stagecue`;
    a.click();
    URL.revokeObjectURL(a.href);
  };  scRef.current.save = exportShow;
  scRef.current.backup = () => { void exportBackup(); };
  scRef.current.toggleLock = toggleLock;
  scRef.current.findReplace = () => { if (!locked) setFrOpen(true); };
  const openShow = async () => {
    const picker = (window as any).showOpenFilePicker;
    if (!picker) { fileRef.current?.click(); return; }
    try {
      const [h] = await picker({ types: [{ description: "StageCue show", accept: { "application/json": [".json", ".stagecue"] } }] });
      const f: File = await h.getFile();
      await importShow(f);
      if (f.name.endsWith(".json")) { fileHandle.current = h; projectDir.current = null; setFileName(h.name); void rememberHandle(showId, { file: h, dir: null }); }
    } catch { /* annulleret */ }
  };
  scRef.current.open = () => { if (!locked) void openShow(); };

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
      applyLayout(s);
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
    else if (d.id !== beforeId) setShow((s) => moveSong(s, d.id, beforeId ?? songId));
    drag.current = null;
  };

  const lastGoEl = lastGo ? (now - lastGo) / 1000 : null;
  const liveCue = liveId ? flat.find((c) => c.id === liveId) : undefined;
  const liveReveal = revealedAt(liveCue, lastGoEl ?? 0);
  const remoteState = useMemo<RemoteState>(() => ({
    showName: show.name,
    currentId: liveId,
    goId: lastGo,
    goAgoMs: lastGo ? performance.now() - lastGo : 0,
    monitors: show.monitors ?? [],
    midiPorts,
    standbyId,
    running: [...new Set(active.map((a) => a.cueId))],
    muted,
    locked,
    songs: show.songs.map((s) => ({ id: s.id, name: s.name, cues: s.cues.map((c) => ({ id: c.id, name: c.name, type: c.type, color: cueColor(show, c), ...monitorFields(c, c.id === liveId ? liveReveal : 0), stikord: c.stikord ?? "", hasAudio: c.type === "audio" && !!c.fileId, ...(c.click ? { click: c.click } : {}) })) })),
  }), [show, standbyId, active, midiPorts, muted, locked, liveId, liveReveal, lastGo]);
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
          { label: "Åbn show…", keys: "Ctrl+O", onClick: () => void openShow(), disabled: locked },
          { label: "Gem show", keys: "Ctrl+S", onClick: exportShow },
          { label: "Gem som…", onClick: () => { trackFeature("file.save_as"); void saveAs(); } },
          { label: "📁 Åbn projektmappe…", onClick: () => { trackFeature("file.open_folder"); void openFolder(); }, disabled: locked },
          { label: "📁 Gem som projektmappe (show + lydfiler)…", onClick: () => { trackFeature("file.save_folder"); void saveAsFolder(); } },
          { label: missing.length ? `🔎 Find ${missing.length} manglende lydfiler…` : "🔎 Find manglende lydfiler…", onClick: () => void relink(), disabled: !missing.length },
          { label: "Eksportér backup m. lyd (.stagecue)…", keys: "Ctrl+Shift+S", onClick: exportBackup },
          "sep",
          { label: "Importér setliste…", onClick: () => setImportOpen(true), disabled: locked },
          "sep",
          { label: "Tilbage til shows", onClick: () => { engine().panic(0); navigate({ to: "/hub" }); } },
        ] },
        { label: "Rediger", items: [
          ...(["audio", "midi", "osc", "fade", "stop", "memo", "dmx", "group"] as CueType[]).map((t) => ({ label: `Nyt ${t}-cue`, onClick: () => addCue(t), disabled: locked })),
          "sep",
          { label: "🔍 Find & erstat…", keys: "Ctrl+H", onClick: () => setFrOpen(true), disabled: locked },
          "sep",
          { label: locked ? "Lås show op" : "Lås show til live", keys: "Ctrl+L", onClick: toggleLock },
          { label: "🛡️ Tjek show før start", onClick: () => void runPreflight() },
        ] },
        { label: "Værktøjer", items: [
          { label: "⏱️ Click / Optælling…", onClick: () => setClickOpen(true), disabled: locked },
          { label: "🕒 Timecode (MTC / LTC)…", onClick: () => setTcOpen(true) },
          { label: "💡 DMX Monitor", onClick: () => { setWin("dmx", { open: true, min: false }); focusWin("dmx"); } },
          { label: "🎛️ Lydbræt (jingles)", onClick: () => { setWin("cart", { open: true, min: false }); focusWin("cart"); } },
          { label: "🔍 Find & erstat…", keys: "Ctrl+H", onClick: () => setFrOpen(true), disabled: locked },
          { label: "📋 Importér setliste…", onClick: () => setImportOpen(true), disabled: locked },
          { label: "⌨️ Genveje…", keys: "Ctrl+K", onClick: () => setKeysOpen(true) },
        ] },
        { label: "Visning", items: [
          { label: "🟢 Simpel visning", onClick: () => setWins(simpleWins()), disabled: locked },
          { label: "⚙️ Avanceret visning", onClick: () => setWins(() => { const d = defaultWins(); d.midimon.open = true; d.pedal.open = true; return d; }), disabled: locked },
          { label: "Nulstil layout", onClick: () => setWins(defaultWins()), disabled: locked },
          "sep",
          ...([["free", "Vinduer: Frit flydende"], ["grid", "Vinduer: Gitter-snap"], ["magnet", "Vinduer: Magnetisk kant-snap"], ["both", "Vinduer: Gitter + magnet"]] as const).map(([m, label]) => ({ label, checked: snap === m, onClick: () => { trackFeature(`window.${m}`); changeSnap(m); } })),
          "sep",
          ...(Object.keys(COLS) as ColKey[]).map((k) => ({ label: COLS[k], checked: view[k], onClick: () => toggleCol(k) })),
        ] },
        { label: "Vinduer", items: (Object.keys(WIN_TITLES) as WinKey[]).map((k) => ({ label: WIN_TITLES[k], checked: wins[k].open, disabled: locked, onClick: () => (wins[k].open ? setWin(k, { open: false }) : (setWin(k, { open: true, min: false }), focusWin(k))) })) },
        { label: "Indstillinger", items: [
          { label: "Lyd, MIDI, I/O-navne & monitorer…", onClick: () => setSettings(true), disabled: locked },
          "sep",
          ...[0, 300, 500, 1000].map((ms) => ({ label: ms ? `Dobbelt-GO-spærre: ${ms / 1000} s` : "Dobbelt-GO-spærre: fra", checked: goGuard === ms, onClick: () => { setGoGuard(ms); localStorage.setItem("stagecue.goguard", String(ms)); } })),
          "sep",
          { label: autoSaveMin ? `Gem automatisk: hver ${autoSaveMin} min…` : "Gem automatisk: Fra…", onClick: () => setSettings(true), disabled: locked },
          "sep",
          ...([["elapsed", "Tidsboks: Aktiv spilletid"], ["lastgo", "Tidsboks: Siden sidste GO"], ["none", "Tidsboks: Kun nedtælling"]] as const).map(([m, label]) => ({ label, checked: timeMode === m, onClick: () => { setTimeMode(m); localStorage.setItem("stagecue.timebox", m); } })),
          "sep",
          ...([["hms", "Tidsformat: Timer:minutter:sekunder"], ["sec", "Tidsformat: Kun sekunder"]] as const).map(([f, label]) => ({ label, checked: timeFmt === f, onClick: () => { trackFeature(`timefmt.${f}`); setTimeFmt(f); localStorage.setItem("stagecue.timefmt", f); } })),
          "sep",
          { label: backup ? "🛡️ Stop Hot-Standby (bliv master)" : "🛡️ Kør som Hot-Standby backup-PC (Pro)…", onClick: () => { if (backup) setBackup(false); else if (needPro("hotStandby")) setBackup(true); } },
        ] },
        { label: "Sprog", items: LANGS.map((l) => ({ label: `🌐 ${LANG_NAMES[l]}`, checked: lang === l, onClick: () => { trackFeature(`lang.${l}`); setAppLang(l); } })) },
        { label: "Hjælp", items: [
          { label: "⌨️ Tastaturgenveje", keys: "Ctrl+K", onClick: () => setKeysOpen(true) },
          { label: "💡 Foreslå ændring / fejl", onClick: () => window.open("/support#ticket", "_blank") },
          { label: "Support", onClick: () => window.open("/support", "_blank") },
          { label: "Vilkår", onClick: () => window.open("/vilkaar", "_blank") },
          "sep",
          { label: "Om StageCue", onClick: () => alert("StageCue — Show control til Windows\n\n🇩🇰 Crafted in Denmark for live performers worldwide\n\nTredjeparts-teknologi:\n• ASIO Technology by Steinberg Media Technologies GmbH.\n  ASIO is a trademark of Steinberg Media Technologies GmbH, registered in Europe and other countries.\n• Tauri, cpal, PeerJS, Web Audio API (open source)\n\n© 2026 StageCue") },
        ] },
      ]; return <div className="flex border-b border-border bg-card"><div className="flex-1 [&>div]:border-b-0"><MenuBar menus={menus} /></div><CommandPalette menus={menus} /></div>; })()}
      {/* top bar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-2">
        <span className="font-mono text-sm font-bold tracking-widest text-go">STAGECUE</span>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">Arbejdstilstand<select aria-label="Arbejdstilstand" disabled={locked || !!guide} value={mode} onChange={(e) => changeMode(readWorkspaceMode(e.target.value))} className="max-w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground"><option value="pro">Pro</option><option value="theatre">Teater & Skole</option></select></label>
        <input
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none focus:bg-input"
          value={show.name}
          readOnly={locked}
          onChange={(e) => setShow({ ...show, name: e.target.value })}
          aria-label="Show navn"
        />
        <span className={`max-w-[40%] truncate text-right text-xs ${saved === "error" ? "text-destructive" : "text-muted-foreground"}`}>{saved === "saving" ? tr("Gemmer…") : saved === "error" ? tr("Ikke gemt!") : (cloudSyncOn() ? tr("✓ Gemt lokalt + sky") : tr("✓ Gemt lokalt"))}{fileName ? ` · 💾 ${fileName}${fileSavedAt ? ` (${fileSavedAt})` : ""}${autoSaveMin ? "" : ""}` : autoSaveMin ? " · Autogem: vælg fil med Gem som" : ""}</span>
        <span className="min-w-[8.5rem] shrink-0 text-right font-mono text-2xl tabular-nums">{clock}</span>
        <button onClick={() => toggleMute()} className={`rounded px-3 py-1.5 text-sm font-bold ${muted ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`} title="Mute alle lydudgange">{muted ? "🔇 PA MUTED" : "🔊 PA"}</button>
        <button onClick={() => void runPreflight()} title="Tjek lydfiler, udgange, MIDI og cues før showet starter" className="rounded bg-secondary px-3 py-1.5 text-sm font-bold">🛡️ {tr("Tjek show")}</button>
        <button onClick={toggleLock} title="Lås mod utilsigtede ændringer under live-afvikling (Ctrl+L)" className={`rounded px-3 py-1.5 text-sm font-black ${locked ? "bg-standby text-background" : "bg-secondary"}`}>{locked ? tr("🔒 LÅST TIL LIVE") : tr("🔓 Lås show")}</button>
        {tcOpen && <TimecodePanel engine={engine} outputs={outputs.filter((o) => o.id).map((o) => ({ deviceId: o.id, label: o.label }))} goId={lastGo} targets={flat.filter((c) => c.tc?.trim()).map((c) => ({ id: c.id, name: c.name, tc: c.tc! }))} onTrigger={fireById} onClose={() => setTcOpen(false)} />}
        {clickOpen && <ClickGenerator onClose={() => setClickOpen(false)} onCreate={createClickCue} />}
        {importOpen && <SetlistImport onClose={() => setImportOpen(false)} onImport={importSetlist} />}
        {frOpen && <FindReplace show={show} outputs={outputs} midiPorts={midiPorts} onApply={(n) => setShow(n)} onGo={(id) => { setFrOpen(false); goToCue(id); }} onClose={() => setFrOpen(false)} />}
        {keysOpen && <ShortcutManager map={shortcuts} onChange={(m) => { setShortcuts(m); saveShortcuts(m); }} onClose={() => setKeysOpen(false)} />}
        {proAsk && <ProDialog feature={proAsk} onClose={() => setProAsk(null)} />}
        {!plan.loading && plan.tier !== "pro" && <a href="/priser" target="_blank" rel="noreferrer" title="Opgrader til Pro" className={`rounded px-2 py-1 text-xs font-bold ${plan.tier === "trial" ? "bg-standby/20 text-standby" : "bg-secondary text-muted-foreground"}`}>{plan.tier === "trial" ? tr(`PRO-prøve: ${plan.trialDaysLeft} dage`) : tr("FREE · Opgrader")}</a>}
        <input ref={fileRef} type="file" accept=".json,.stagecue,application/json" hidden onChange={(e) => e.target.files?.[0] && importShow(e.target.files[0])} />
      </header>

      {shownDiags.length > 0 && (
        <div role="alert" className="flex items-center gap-3 bg-destructive px-4 py-2 text-destructive-foreground">
          <span className="min-w-0 flex-1 animate-pulse text-lg font-black">⚠️ {shownDiags.map((d) => diagShort(d, lang)).join(" · ")}</span>
          <button onClick={() => setDiagOpen(true)} className="shrink-0 rounded bg-background px-3 py-1 text-sm font-bold text-foreground">ℹ️ {diagUi("more", lang)}</button>
          <button onClick={() => setDismissed((x) => [...x, ...shownDiags.map(dKey)])} title={tr("Skjul fejlbeskeden – den kommer igen, hvis fejlen opstår igen")} aria-label={diagUi("close", lang)} className="shrink-0 rounded px-2 py-1 text-lg font-black hover:bg-background/20">✕</button>
        </div>
      )}
      {diagOpen && shownDiags.length > 0 && (
        <div className="fixed inset-0 z-[100005] flex items-start justify-center overflow-y-auto bg-background/70 p-6" onClick={() => setDiagOpen(false)}>
          <div role="dialog" aria-label={diagUi("title", lang)} className="w-full max-w-xl rounded-lg border-2 border-destructive bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center"><h2 className="flex-1 text-lg font-black">⚠️ {diagUi("title", lang)}</h2><button onClick={() => setDiagOpen(false)} className="px-2 text-muted-foreground hover:text-foreground" aria-label={diagUi("close", lang)}>✕</button></div>
            <div className="flex flex-col gap-3">
              {shownDiags.map((d) => { const x = explain(d, lang); return (
                <div key={d.code + d.slot} className="rounded border border-border p-3 text-sm">
                  <div className="mb-2 font-black text-destructive">{diagShort(d, lang)}</div>
                  <p><b>{diagUi("what", lang)}:</b> {x.what}</p>
                  <p className="mt-1"><b>{diagUi("impact", lang)}:</b> {x.impact}</p>
                  <p className="mt-1"><b>{diagUi("fix", lang)}:</b> {x.fix}</p>
                  <button className="mt-2 rounded bg-secondary px-3 py-1.5 text-sm font-semibold hover:bg-accent" onClick={() => {
                    if (x.action === "settings") { setDiagOpen(false); setSettings(true); }
                    else if (x.action === "rescanMidi") engine().initMidi().then(setMidiPorts).catch((e) => setError(e.message));
                    else listAudioOutputs(true).then((o) => setOutputs(dedupe(o))).catch((e) => setError(e.message));
                  }}>{diagUi(x.action, lang)}</button>
                  {x.action !== "settings" && <button className="ml-2 mt-2 rounded bg-secondary px-3 py-1.5 text-sm font-semibold hover:bg-accent" onClick={() => { setDiagOpen(false); setSettings(true); }}>{diagUi("settings", lang)}</button>}
                  {!!d.cues?.length && <div className="mt-2 flex flex-wrap gap-2">{d.cues.map((id) => { const c = flat.find((f) => f.id === id); return c ? <button key={id} onClick={() => goToCue(id)} className="rounded bg-standby px-3 py-1.5 text-sm font-bold text-background">🎯 {tr("Gå til")}: {c.name}</button> : null; })}</div>}
                </div>
              ); })}
            </div>
          </div>
        </div>
      )}
      {pf && (
        <div className="fixed inset-0 z-[100005] flex items-start justify-center overflow-y-auto bg-background/70 p-6" onClick={() => setPf(null)}>
          <div role="dialog" aria-label="Show-tjek" className={`w-full max-w-xl rounded-lg border-2 bg-card p-4 shadow-2xl ${pf.length + diags.length ? "border-destructive" : "border-go"}`} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center"><h2 className="flex-1 text-lg font-black">🛡️ {tr("Tjek show før start")}</h2><button onClick={() => setPf(null)} className="px-2 text-muted-foreground hover:text-foreground" aria-label="Luk">✕</button></div>
            {pf.length + diags.length === 0 ? (
              <div className="rounded bg-go p-4 text-center text-lg font-black text-background">✓ {tr("Showet er klar")} – 0 {tr("fejl")}<div className="mt-1 text-sm font-semibold">{show.songs.length} {tr("sange")} · {flat.length} cues · {tr("alle udgange forbundet")}</div></div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="font-black text-destructive">⚠️ {pf.length + diags.length} {tr("ting skal tjekkes")}</div>
                {diags.map((d) => (
                  <div key={"d" + d.code + d.slot} className="flex flex-wrap items-center gap-2 rounded border border-border p-2 text-sm">
                    <span className="flex-1">{diagShort(d, lang)}</span>
                    <button onClick={() => { setPf(null); setSettings(true); }} className="rounded bg-secondary px-3 py-1 font-semibold">{diagUi("settings", lang)}</button>
                    {d.cues?.[0] && <button onClick={() => { setPf(null); goToCue(d.cues![0]!); }} className="rounded bg-standby px-3 py-1 font-bold text-background">🎯 {tr("Gå til cue")}</button>}
                  </div>
                ))}
                {pf.map((x, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-border p-2 text-sm">
                    <span className="flex-1"><b>{x.cueName ?? ""}</b>{x.cueName ? ": " : ""}{tr(x.text)}</span>
                    {x.code === "fileMissing" && <button onClick={() => { setPf(null); void relink(); }} className="rounded bg-secondary px-3 py-1 font-semibold">🔎 {tr("Find lydfiler")}</button>}
                    {x.cueId && <button onClick={() => { setPf(null); goToCue(x.cueId!); }} className="rounded bg-standby px-3 py-1 font-bold text-background">🎯 {tr("Gå til cue")}</button>}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2"><button onClick={() => void runPreflight()} className="rounded bg-secondary px-3 py-1.5 text-sm font-semibold">↻ {tr("Tjek igen")}</button></div>
          </div>
        </div>
      )}
      <HelpTips />
      {backup && <HotStandby showId={showId} onStandby={(id) => setStandbyId(id)} onStop={() => setBackup(false)} />}
      {resume && (
        <div role="alert" className="flex flex-wrap items-center gap-3 bg-standby px-4 py-2 text-sm font-black text-background">
          <span>⚡ Showet lukkede uventet. Sidste standby: {resume.label || "ukendt cue"}</span>
          <button onClick={() => { setStandbyId(resume.standbyId); setResume(null); }} className="rounded bg-background px-3 py-1 text-foreground">{tr("Genoptag herfra")}</button>
          <button onClick={() => setResume(null)} className="rounded px-3 py-1 underline">{tr("Start forfra")}</button>
        </div>
      )}
      {missing.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center gap-3 bg-standby px-4 py-2 text-sm font-bold text-background">
          <span>⚠️ {missing.length} {tr("lydfiler mangler på denne computer")}</span>
          <button onClick={() => void relink()} className="rounded bg-background px-3 py-1 text-foreground">{tr("Find filer i mappe…")}</button>
          <span className="truncate font-normal opacity-80">{missing.slice(0, 3).map((m) => m.fileName).join(", ")}{missing.length > 3 ? " …" : ""}</span>
        </div>
      )}
      {relinkMsg && <button onClick={() => setRelinkMsg(null)} className="bg-go px-4 py-1 text-left text-sm font-bold text-go-foreground">{relinkMsg}</button>}
      <input ref={relinkInput} type="file" hidden multiple {...({ webkitdirectory: "" } as any)} onChange={(e) => { const fs = [...(e.target.files ?? [])]; e.target.value = ""; void relinkFiles(fs.map((f) => ({ name: f.name, get: async () => f }))); }} />
      {recovered && <div className="bg-go px-4 py-1 text-sm font-bold text-go-foreground">{recovered}</div>}
      {error && (
        <div className="flex items-center justify-between bg-destructive px-4 py-1 text-sm font-semibold text-destructive-foreground">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="px-2" title="Luk">✕</button>
        </div>
      )}

<div className={guided ? "relative grid min-h-0 flex-1 gap-px overflow-auto bg-border lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)] lg:grid-rows-[minmax(15rem,1fr)_minmax(20rem,1fr)]" : "relative min-h-0 flex-1 overflow-hidden"}>
<FloatingWindow docked={guided} dockedClassName="min-h-64 lg:col-start-2 lg:row-start-1" locked={locked} title={"Scene · Nu & Næste"} state={workspaceState("stage")} onChange={(p) => setWin("stage", p)} onFocus={() => focusWin("stage")} accent>
<StageView show={show} flat={flat} standby={standby ?? null} standbyIdx={standbyIdx} warn={!!mainRun && mainRun.duration! - mainRun.elapsed <= 10} size={noteSize} setSize={setNoteSize} onNotes={(v) => standby && updateCue(standby.id, { notes: v })} />
</FloatingWindow>
<FloatingWindow docked={guided} dockedClassName="min-h-96 lg:col-start-2 lg:row-start-2" locked={locked} title={"Transport"} state={workspaceState("transport")} onChange={(p) => setWin("transport", p)} onFocus={() => focusWin("transport")}>
<div className="flex flex-col gap-3 p-3">
          <button
            onClick={go}
            disabled={!standby}
            title="Kør næste cue i setlisten (Mellemrum)"
            className="h-[clamp(5rem,30cqw,8rem)] rounded-xl bg-go text-[clamp(2rem,16cqw,3.75rem)] font-black tracking-widest text-go-foreground shadow-[0_0_40px_-8px_var(--go)] transition active:scale-[0.98] disabled:opacity-30"
          >
            GO
          </button>
          <div className="text-center text-xs text-muted-foreground">{tr("Mellemrum = GO · ↑↓ = flyt standby · Esc = nød-fade · Esc×2 = stop nu")}</div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={panic} title="Nødfade alle kørende cues ud (Esc)" className="h-16 rounded-lg bg-destructive text-[clamp(0.8rem,5cqw,1.125rem)] font-black text-destructive-foreground">
              PANIC
              <div className="text-xs font-normal">fade {show.panicFade}s</div>
            </button>
            <button onClick={hardStop} title="Stop al lyd og MIDI øjeblikkeligt uden fade (Esc × 2)" className="h-16 rounded-lg border-2 border-destructive text-[clamp(0.8rem,5cqw,1.125rem)] font-black text-destructive">
              {tr("STOP ALT")}
            </button>
          </div>

          <div className={`grid gap-2 font-mono ${timeMode === "none" ? "grid-cols-1" : "grid-cols-2"}`}>
            {timeMode === "lastgo" && <TimeBox label="Siden sidste GO" value={fmtTime(lastGoEl, timeFmt)} />}
            {timeMode === "elapsed" && <TimeBox label="Spilletid" value={mainRun ? fmtTime(mainRun.elapsed, timeFmt) : fmtTime(null, timeFmt)} />}
            <TimeBox label="Nedtælling" value={mainRun ? "-" + fmtTime(mainRun.duration! - mainRun.elapsed, timeFmt) : fmtTime(null, timeFmt)} accent />
          </div>

          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{tr("Aktive")} ({active.length})</div>
            <div className="flex flex-col gap-1">
              {active.map((a) => (
                <ActiveBar key={a.key} row={a} color={cueColorById(show, a.cueId)} onStop={() => engine().stopCue(a.cueId)} />
              ))}
              {!active.length && <div className="text-sm text-muted-foreground">{tr("Intet kører")}</div>}
            </div>
          </div>
        </div>
</FloatingWindow>
{loaded && <RemoteHost showId={showId} state={remoteState} onCmd={onRemote} getAudio={async (id) => { const c = flat.find((x) => x.id === id); return c?.type === "audio" && c.fileId ? getAudio(c.fileId) : undefined; }} renderPanel={(panel) => <FloatingWindow locked={locked} title={"Telefon & scenemonitors"} state={wins.remote} onChange={(p) => setWin("remote", p)} onFocus={() => focusWin("remote")}>{panel}</FloatingWindow>} />}
<FloatingWindow docked={guided} dockedClassName="order-first min-h-96 lg:col-start-1 lg:row-span-2 lg:row-start-1" locked={locked} title={guided ? "Akter / Scener & Cues" : "Setliste & Cues"} state={workspaceState("list")} onChange={(p) => setWin("list", p)} onFocus={() => focusWin("list")}>
<div className="flex h-full min-h-0 flex-col">
          {!locked && <div className="flex flex-wrap gap-1 border-b border-border p-2">
            {guided ? <Button variant="secondary" disabled={!show.songs.length} onClick={() => {
              const sceneId = selectedSongId ?? show.songs.find((s) => s.cues.some((c) => c.id === selectedId))?.id ?? show.songs[0]?.id;
              if (sceneId) setGuide({ cue: null, editing: false, sceneId });
            }}>+ Opret cue</Button> : TYPES.map((t) => (
              <button
                key={t}
                onClick={() => addCue(t)}
                title={TIP[t]}
                className="rounded border-l-4 bg-secondary px-3 py-1.5 text-sm font-semibold hover:bg-accent"
                style={{ borderLeftColor: show.typeColors[t] || DEFAULT_TYPE_COLORS[t] }}
              >
                + {tr(TYPE_LABEL[t])}
              </button>
            ))}
            <Button variant="secondary" onClick={addSong} className="ml-auto">{guided ? "+ Opret Akt/Scene" : tr("+ Sang")}</Button>
          </div>}
          <div className="border-b border-border p-2"><input value={songQuery} onChange={(e) => setSongQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setSongQuery(""); }} placeholder={tr("🔍 Søg i sange, cues, numre, stikord og noter…")} aria-label="Søg i cues" className="w-full rounded border border-input bg-input px-2 py-1 text-sm" /></div>
          <div
            className={`relative min-h-0 flex-1 overflow-y-auto p-2 ${fileDrop !== null ? "outline outline-2 -outline-offset-2 outline-standby" : ""}`}
            onDragOverCapture={(e) => { if (!isFileDrag(e)) return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy"; const sid = (e.target as HTMLElement).closest("[data-song-id]")?.getAttribute("data-song-id") ?? ""; if (sid !== fileDrop) setFileDrop(sid); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFileDrop(null); }}
            onDropCapture={(e) => { if (!isFileDrag(e)) return; e.preventDefault(); e.stopPropagation(); const t = e.target as HTMLElement; void dropFiles(Array.from(e.dataTransfer.files), t.closest("[data-song-id]")?.getAttribute("data-song-id") ?? null, t.closest("[data-cue-id]")?.getAttribute("data-cue-id") ?? null); }}
          >
            {fileDrop !== null && <div className="pointer-events-none sticky top-0 z-10 mb-2 rounded bg-standby px-3 py-2 text-center text-sm font-black text-background">{tr("⬇ Slip her for at oprette lyd-cues")}</div>}
            {show.songs.map((song, si) => { const q = songQuery.trim().toLowerCase(); const songHit = !q || song.name.toLowerCase().includes(q); const cues = songHit ? song.cues : song.cues.filter((c) => cueMatches(c, q, flat.indexOf(c) + 1)); if (q && !cues.length) return null; return (
              <section key={song.id} data-song-id={song.id} className={`mb-3 ${fileDrop === song.id ? "rounded ring-2 ring-standby" : ""}`}>
                <div
                  draggable={!locked}
                  onDragStart={(e) => { drag.current = { kind: "song", id: song.id }; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", song.id); }}
                  onDragEnd={() => { drag.current = null; setDropKey(null); }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropKey("s" + song.id);
                  }}
                  onDrop={(e) => { e.preventDefault(); const d = drag.current; if (d?.kind === "cue") onDropCue(song.id, song.cues[0]?.id ?? null); else onDropCue(song.id, song.id); }}
                  onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; setSelectedSongId(song.id); setSelectedId(null); }}
                  className={`flex cursor-grab items-center gap-2 rounded-t bg-muted px-3 py-2 ${dropKey === "s" + song.id ? "ring-2 ring-standby" : ""} ${selectedSongId === song.id && !selectedId ? "outline outline-2 -outline-offset-2 outline-standby" : ""}`}
                >
                  <span className="font-mono text-sm text-muted-foreground">{si + 1}</span>
                  <input
                    value={song.name}
                    readOnly={locked}
                    onChange={(e) => renameSong(song.id, e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-lg font-bold outline-none focus:bg-input"
                  />
                  <span className="text-xs text-muted-foreground">{song.cues.length} cues</span>
                  {!locked && <button disabled={si === 0} onClick={() => setShow((s) => moveSong(s, song.id, s.songs[si - 1]?.id ?? null))} className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Flyt sang op" title="Flyt sang op">▲</button>}
                  {!locked && <button disabled={si === show.songs.length - 1} onClick={() => setShow((s) => moveSong(s, song.id, s.songs[si + 2]?.id ?? null))} className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Flyt sang ned" title="Flyt sang ned">▼</button>}
                  {!locked && <button onClick={() => deleteSong(song.id)} className="px-2 text-muted-foreground hover:text-destructive" aria-label="Slet sang" title="Slet sang">✕</button>}
                </div>
                {!song.cues.length && !locked && <button onDragOver={(e) => { e.preventDefault(); setDropKey("e" + song.id); }} onDrop={(e) => { e.preventDefault(); if (drag.current?.kind === "cue") onDropCue(song.id, null); }} onClick={() => { setSelectedSongId(song.id); setSelectedId(null); }} className={`w-full border-b border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground hover:bg-secondary ${selectedSongId === song.id && !selectedId ? "text-standby" : ""}`}>{tr("Tom sang – klik her, og vælg en cue-type for at tilføje første cue")}</button>}
                {cues.map((c) => {
                  const idx = flat.indexOf(c);
                  const isStandby = c.id === standbyId;
                  const isRunning = active.some((a) => a.cueId === c.id);
                  return (
                    <div
                      key={c.id}
                      draggable={!locked}
                      onDragStart={(e) => { e.stopPropagation(); drag.current = { kind: "cue", id: c.id }; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", c.id); }}
                      onDragEnd={() => { drag.current = null; setDropKey(null); }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = "move";
                        setDropKey(c.id);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (drag.current?.kind === "cue" && drag.current.id !== c.id) onDropCue(song.id, c.id); else { drag.current = null; setDropKey(null); }
                      }}
                      onClick={() => { setSelectedId(c.id); setSelectedSongId(song.id); setStandbyId(c.id); }}
                      onDoubleClick={() => { if (guided && !locked) setGuide({ cue: c, editing: true, sceneId: song.id }); else setStandbyId(c.id); }}
                      data-cue-id={c.id}
                      style={{ borderLeftColor: cueColor(show, c), gridTemplateColumns: gridCols(view).replaceAll("_", " ") }}
                      className={`grid cursor-pointer select-none items-center gap-2 border-b border-l-4 border-border px-2 py-0.5 text-sm leading-tight ${
                        selectedId === c.id ? "bg-accent" : "bg-card hover:bg-secondary"
                      } ${dropKey === c.id ? "border-t-4 border-t-standby" : ""} ${isStandby ? "outline outline-2 -outline-offset-2 outline-standby" : ""}`}
                    >
                      {view.handle && <span title="Træk for at flytte – også over i en anden sang" className={`select-none text-center text-muted-foreground ${locked ? "opacity-0" : "cursor-grab active:cursor-grabbing"}`}>⋮⋮</span>}
                      <span className="text-center font-black text-standby">{isStandby ? "▶" : isRunning ? <span className="text-go">●</span> : ""}</span>
                      {view.number && <span className="font-mono text-sm text-muted-foreground" title={c.ref ? `Manuskript: ${c.ref}` : undefined}>{c.number || idx + 1}</span>}
                      <div className="min-w-0">
                        <div className="break-words font-semibold">{c.name}</div>
                        {view.details && <div className="break-words text-xs text-muted-foreground">{summary(c, midiPorts, show)}</div>}
                        {view.stikord && c.stikord && <div className="break-words text-xs font-bold text-standby">⏱ {c.stikord}</div>}
                      </div>
                      {view.type && <TypeTag show={show} cue={c} />}
                      {view.follow && <span className="w-24 text-right font-mono text-xs text-muted-foreground">{followLabel(c)}</span>}
                      {guided && !locked && selectedId === c.id && <Button variant="secondary" size="sm" className="col-span-full justify-self-start" onClick={(e) => { e.stopPropagation(); setGuide({ cue: c, editing: true, sceneId: song.id }); }}>Rediger cue</Button>}
                      {!locked && selectedId === c.id && <span className="col-span-full flex gap-1 pb-0.5"><button onClick={(e) => { e.stopPropagation(); setShow((s) => shiftCue(s, c.id, -1)); }} className="rounded bg-secondary px-2 text-xs hover:bg-accent" aria-label="Flyt cue op" title="Flyt cue op (Alt+↑)">▲ Op</button><button onClick={(e) => { e.stopPropagation(); setShow((s) => shiftCue(s, c.id, 1)); }} className="rounded bg-secondary px-2 text-xs hover:bg-accent" aria-label="Flyt cue ned" title="Flyt cue ned (Alt+↓)">▼ Ned</button><span className="text-xs text-muted-foreground">Alt+↑/↓</span></span>}
                    </div>
                  );
                })}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropKey("e" + song.id);
                  }}
                  onDrop={(e) => { e.preventDefault(); if (drag.current?.kind === "cue") onDropCue(song.id, null); else { drag.current = null; setDropKey(null); } }}
                  className={`rounded-b transition-all ${dropKey === "e" + song.id ? "h-8 bg-standby/60" : "h-4 bg-muted/40"}`}
                />
              </section>
            ); })}
            {!show.songs.length && <div className="p-8 text-center text-muted-foreground">{tr("Tilføj en sang for at komme i gang")}</div>}
          </div>
        </div>
</FloatingWindow>
<FloatingWindow locked={locked} title={"Cue Inspector"} state={workspaceState("inspector")} onChange={(p) => setWin("inspector", p)} onFocus={() => focusWin("inspector")}>
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
              onChange={(p) => { updateCue(selected.id, p); if (selected.type === "audio") engineRef.current?.liveMix({ ...selected, ...p } as AudioCue); }}
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
              testTone={(o, ch, m) => { void engine().testTone(o, ch, m); }}
              pfl={(fid, end) => { void engine().pfl(fid, resolveOut(show, "audio", show.pflOut || "", outputs) || "", show.pflCh ?? 1, end).catch(() => { setError("Forlyt kunne ikke afspilles"); end(); }); }}
              stopPfl={() => engine().stopPfl()}
              onSaveDefault={(c) => setShow((s) => ({ ...s, cueDefaults: { ...s.cueDefaults, [c.type]: cueAsDefault(c) } }))}
              onResetDefault={(t) => setShow((s) => { const d = { ...s.cueDefaults }; delete d[t]; return { ...s, cueDefaults: d }; })}
            />
          ) : (
            <div className="text-muted-foreground">Vælg et cue for at redigere. Dobbeltklik for at sætte det som standby.</div>
          )}
        </div>
</FloatingWindow>
<FloatingWindow locked={locked} title={"MIDI-controller"} state={wins.pedal} onChange={(p) => setWin("pedal", p)} onFocus={() => focusWin("pedal")}>
<PedalPanel map={pedals} learning={learning} last={lastMidi} onLearn={setLearning} onClear={(k) => setPedals((m) => { const n = { ...m }; delete n[k]; return n; })} />
</FloatingWindow>
<FloatingWindow locked={locked} title={"Lydbræt (jingles)"} state={wins.cart} onChange={(p) => setWin("cart", p)} onFocus={() => focusWin("cart")}>
<CartPanel show={show} pads={show.cart ?? []} locked={locked} outputs={outputs} playing={new Set(active.map((r) => r.cueId))}
  setPads={(fn) => setShow((s) => ({ ...s, cart: fn(s.cart ?? []) }))}
  onFire={(p) => { trackFeature("cart.fire"); void engine().execute(p); }}
  onStop={(id) => engine().stopCue(id)}
  onAddFiles={async (files) => {
    const audio = files.filter((f) => f.type.startsWith("audio/") || AUDIO_EXT.test(f.name));
    const made: CartPad[] = [];
    for (const f of audio) { const id = uid(); await putAudio(id, f); made.push({ ...(newCue("audio", show.cueDefaults) as CartPad), id: uid(), name: f.name.replace(/\.[^.]+$/, ""), fileId: id, fileName: f.name }); }
    if (made.length) setShow((s) => ({ ...s, cart: [...(s.cart ?? []), ...made] }));
  }} />
</FloatingWindow>
<FloatingWindow locked={locked} title={"DMX Monitor"} state={wins.dmx} onChange={(p) => setWin("dmx", p)} onFocus={() => focusWin("dmx")}>
<DmxMonitor show={show} />
</FloatingWindow>
<FloatingWindow locked={locked} title={"MIDI Monitor"} state={wins.midimon} onChange={(p) => setWin("midimon", p)} onFocus={() => focusWin("midimon")}>
<MidiMonitor rows={show.ioAliases?.midi ? midiLog.map((r) => ({ ...r, port: show.ioAliases?.midi?.[r.port]?.trim() || r.port })) : midiLog} paused={monPaused} setPaused={setMonPaused} onClear={() => setMidiLog([])} ins={midiIns.map((p) => show.ioAliases?.midi?.[p]?.trim() || p)} outs={midiPorts.map((p) => show.ioAliases?.midi?.[p]?.trim() || p)} />
</FloatingWindow>
</div>

      {sceneOpen && <Dialog open onOpenChange={setSceneOpen}><DialogContent className="z-[100010]" aria-describedby={undefined}><DialogHeader><DialogTitle>Opret Akt/Scene</DialogTitle></DialogHeader><form onSubmit={(e) => {
        e.preventDefault(); if (!sceneName.trim() || locked) return;
        const id = uid(); setShow((s) => ({ ...s, songs: [...s.songs, { id, name: sceneName.trim(), cues: [] }] })); setSelectedSongId(id); setSelectedId(null); setSceneOpen(false);
      }}><label className="block space-y-2 text-sm font-semibold">Navn<input autoFocus aria-label="Akt/Scene-navn" className={inputCls} value={sceneName} onChange={(e) => setSceneName(e.target.value)} /></label><div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setSceneOpen(false)}>Annuller</Button><Button type="submit" disabled={!sceneName.trim()}>Opret Akt/Scene</Button></div></form></DialogContent></Dialog>}
      {guide && !locked && <CueWizard show={show} initial={guide.cue} editing={guide.editing} sceneId={guide.sceneId} onClose={() => setGuide(null)} allowType={(t) => t !== "group" || needPro("group")}
        onSave={async (draft, file, sceneId) => {
          let cue = draft;
          if (file && draft.type === "audio") { const id = uid(); await putAudio(id, file); cue = { ...draft, fileId: id, fileName: file.name }; }
          setShow((s) => saveGuidedCue(s, cue, guide.editing, selectedId, sceneId));
          setSelectedId(cue.id); setSelectedSongId(sceneId); if (!guide.editing) { setStandbyId(cue.id); trackFeature(`cue.${cue.type}`); }
        }}
        renderNotes={(cue, change) => <MonitorNotes cue={cue} monitors={show.monitors ?? []} onChange={change} />}
        renderSettings={(cue, change, onFile) => <Inspector cue={cue} show={show} flat={flat} midiPorts={midiPorts} outputs={outputs} guidedSection="type" onChange={change} onFile={onFile}
          onDelete={() => {}} onStandby={() => {}} onFire={() => engine().execute(cue)} onTestMidi={(m) => engine().sendMidi(m)} needPro={needPro}
          loadAudio={(fid, out) => engine().decoded(fid, out)} channelCount={(out) => engine().channelCount(out)}
          testTone={(out, ch, mono) => { void engine().testTone(out, ch, mono); }}
          pfl={(fid, end) => { void engine().pfl(fid, resolveOut(show, "audio", show.pflOut || "", outputs) || "", show.pflCh ?? 1, end).catch(() => { setError("Forlyt kunne ikke afspilles"); end(); }); }} stopPfl={() => engine().stopPfl()} />}
      />}
      {settings && (
        <Settings
          pro={pro}
          autoSaveMin={autoSaveMin}
          setAutoSaveMin={(n) => { trackFeature(n ? "autosave.on" : "autosave.off"); setAutoSaveMin(n); localStorage.setItem("stagecue.autosave", String(n)); }}
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

const TIP: Record<string, string> = {
  audio: "Afspil musik, lydeffekt eller atmosfære",
  midi: "Send MIDI (Program Change, CC, Note) til lyspult, mixer eller andet grej",
  osc: "Send OSC-netværksbesked til QLC+, Resolume, GrandMA, Reaper m.fl.",
  fade: "Skru gradvist op eller ned for et eller alle kørende lyd-cues",
  stop: "Stop et bestemt cue eller alle cues, evt. med fade",
  pause: "Sæt kørende lyd på pause",
  wait: "Vent et antal sekunder før næste cue",
  memo: "Skriftlig note eller sceneskift til teknikeren",
  group: "Kør flere cues samtidig på ét GO",
};

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

function summary(c: Cue, ports: string[], show?: Show): string {
  switch (c.type) {
    case "group":
      return `${c.children.length} cues samtidig: ${c.children.map((x) => x.name).join(", ")}`;
    case "audio":
      return `${c.fileName || "ingen fil"} · ${c.volume}dB${c.loop ? " · loop" : ""}`;
    case "midi":
      return c.messages.map((m) => {
        const hw = show ? resolveOut(show, "midi", m.port) : m.port;
        const missing = hw ? !ports.includes(hw) : false;
        return `${m.port || "?"}${missing ? "⚠" : ""} ${midiKindInfo(m.kind).label} ch${m.channel} ${m.data1}${midiKindInfo(m.kind).d2 ? "/" + m.data2 : ""}`;
      }).join(" · ");
    case "osc":
      return `${c.host}:${c.port} ${c.address} ${c.args}`;
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
    case "dmx":
      return `${c.values.length} kanaler · fade ${c.fade}s${c.full ? " · hel scene" : ""}`;
  }
}

function TypeTag({ show, cue }: { show: Show; cue: Cue }) {
  return (
    <span className="rounded px-1.5 py-0 text-[10px] font-bold uppercase text-background" style={{ backgroundColor: cueColor(show, cue) }}>
      {TYPE_LABEL[cue.type]}
    </span>
  );
}

function TimeBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const tr = useTrApp();
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-2 text-center">
      <div className="break-words font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{tr(label)}</div>
      <div className={`text-[clamp(1rem,7cqw,1.5rem)] tabular-nums ${accent ? "text-standby" : ""}`}>{value}</div>
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
        <span className="min-w-0 flex-1 break-words font-semibold">{row.name}</span>
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
  const tr = useTrApp();
  return (
    <button onClick={onClick} className="rounded bg-secondary px-3 py-1.5 text-sm font-semibold hover:bg-accent">
      {typeof children === "string" ? tr(children) : children}
    </button>
  );
}

function Knob({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col items-center gap-1 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} onDoubleClick={() => onChange(unit === "Hz" ? 1000 : 0)} className="w-full accent-[var(--standby)]" />
      <span className="tabular-nums">{value > 0 && unit === "dB" ? "+" : ""}{value}{unit}</span>
    </label>
  );
}

function MixStrip({ cue, set, tr }: { cue: AudioCue; set: (p: Record<string, unknown>) => void; tr: (s: string) => string }) {
  const flat = !(cue.eqLow || cue.eqMid || cue.eqHigh) && (cue.eqMidFreq ?? 1000) === 1000;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-2">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>{tr("Indgang & EQ")}</span>
        {!flat && <button className="font-normal text-muted-foreground underline" onClick={() => set({ eqLow: 0, eqMid: 0, eqHigh: 0, eqMidFreq: 1000 })}>{tr("Nulstil EQ")}</button>}
      </div>
      <div className="grid grid-cols-2 items-end gap-2">
        <Knob label={tr("Trim")} value={cue.trim ?? 0} min={-24} max={24} step={0.5} unit="dB" onChange={(n) => set({ trim: n })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!cue.hpf} onChange={(e) => set({ hpf: e.target.checked })} /> {tr("Low-cut 80 Hz")}</label>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Knob label={tr("Diskant")} value={cue.eqHigh ?? 0} min={-15} max={15} step={0.5} unit="dB" onChange={(n) => set({ eqHigh: n })} />
        <Knob label={tr("Mellem")} value={cue.eqMid ?? 0} min={-15} max={15} step={0.5} unit="dB" onChange={(n) => set({ eqMid: n })} />
        <Knob label={tr("Mellem-frekvens")} value={cue.eqMidFreq ?? 1000} min={200} max={5000} step={50} unit="Hz" onChange={(n) => set({ eqMidFreq: n })} />
        <Knob label={tr("Bas")} value={cue.eqLow ?? 0} min={-15} max={15} step={0.5} unit="dB" onChange={(n) => set({ eqLow: n })} />
      </div>
      <p className="text-[10px] text-muted-foreground">{tr("Dobbeltklik på en skyder for at nulstille. Ændringer høres med det samme, også mens cuet spiller.")}</p>
    </div>
  );
}

function Field({ label, children, tip }: { label: string; children: ReactNode; tip?: string }) {
  const tr = useTrApp();
  return (
    <label title={tip} className="setting-field flex min-w-0 flex-col gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {tr(label)}
      <div className="font-normal normal-case tracking-normal text-foreground">{children}</div>
    </label>
  );
}

const inputCls = "w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring";

function Num({ value, onChange, step = 0.1, min, max }: { value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number }) {
  return <input type="number" className={inputCls} value={value} step={step} min={min} max={max} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />;
}

function TargetSelect({ value, flat, onChange }: { value: string; flat: Cue[]; onChange: (v: string) => void }) {
  const tr = useTrApp();
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">{tr("Alle lyd-cues")}</option>
      {flat.filter((c) => c.type === "audio").map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}

function ClickExport({ fileId, name, click }: { fileId: string; name: string; click: NonNullable<Cue["click"]> }) {
  const tr = useTrApp();
  const [prog, setProg] = useState<number | null>(null);
  const wav = async () => { const b = await getAudio(fileId); if (b) downloadBlob(new Blob([b], { type: "audio/wav" }), `${safeName(name)}.wav`); };
  const mp4 = async () => {
    const b = await getAudio(fileId); if (!b) return;
    setProg(0);
    try { const v = await renderClickVideo(b, click, setProg); downloadBlob(v.blob, `${safeName(name)}.${v.ext}`); } finally { setProg(null); }
  };
  return (
    <Field label="Eksportér click">
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={wav}>⬇ WAV</Btn>
        <Btn onClick={() => { if (prog === null) void mp4(); }}>{prog === null ? "⬇ MP4 (video)" : `${tr("Laver video…")} ${Math.round(prog * 100)}%`}</Btn>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{tr("Videoen optages i realtid, så den tager lige så lang tid som clicket.")}</div>
    </Field>
  );
}

function Inspector(props: {
  cue: Cue; show: Show; flat: Cue[]; midiPorts: string[]; outputs: Output[];
  onChange: (p: Partial<Cue>) => void; onDelete: () => void; onStandby: () => void; onFire: () => void;
  onFile: (f: File) => void; onTestMidi: (m: MidiMsg) => void;
  loadAudio: (fileId: string, outputId: string) => Promise<AudioBuffer>;
  needPro: (f: ProFeature) => boolean;
  channelCount: (outputId: string) => Promise<number>;
  testTone?: (outputId: string, ch: number, mono: boolean) => void;
  pfl: (fileId: string, onEnd: () => void) => void;
  stopPfl: () => void;
  inGroup?: boolean;
  guidedSection?: "type";
  onSaveDefault?: (c: Cue) => void;
  onResetDefault?: (t: CueType) => void;
}) {
  const { cue, show, flat, midiPorts, outputs, onChange } = props;
  const set = (p: Record<string, unknown>) => onChange(p as Partial<Cue>);
  const tr = useTrApp();
  const typeTab: Record<string, string> = { audio: "🔊 Lyd", midi: "🎹 MIDI", osc: "🌐 OSC", fade: "📉 Fade", stop: "⏹ Stop", pause: "⏸ Pause", wait: "⏱ Vent", memo: "📝 Tekst", dmx: "💡 Lys", group: "🗂 Gruppe" };
  const [tab, setTab] = useState<"type" | "general" | "notes">("type");
  const tabs: [typeof tab, string][] = [["type", typeTab[cue.type] ?? "Cue"], ["general", "⚙️ Generelt"], ["notes", "📋 Noter & monitor"]];
  return (
    <div className="cue-inspector flex flex-col gap-3">
      {!props.guidedSection && <>
      <div className="flex items-center gap-2">
        <TypeTag show={show} cue={cue} />
        <div className="ml-auto flex gap-1">
          <span title="Sæt dette cue som næste i køen"><Btn onClick={props.onStandby}>Standby</Btn></span>
          <span title="Afspil cuet nu uden at flytte standby"><Btn onClick={props.onFire}>Test</Btn></span>
          <button onClick={props.onDelete} title="Slet cuet" className="rounded bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground">{tr("Slet")}</button>
        </div>
      </div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border pb-1">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-t border-b-2 px-3 py-2 text-sm font-semibold ${tab === k ? "border-standby bg-secondary text-foreground" : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{tr(l)}</button>)}
      </div>
      </>}
      {tab === "general" && <>
      <Field label="Navn"><input className={inputCls} value={cue.name} onChange={(e) => set({ name: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Cue-nummer (fx 1, 1.5, 12.25)"><input className={inputCls} inputMode="decimal" placeholder="auto" value={cue.number ?? ""} onChange={(e) => set({ number: e.target.value.replace(",", ".").replace(/[^0-9.]/g, "") })} /></Field>
        <Field label="Manuskript-ref (side/replik)"><input className={inputCls} placeholder={tr("fx s. 34")} value={cue.ref ?? ""} onChange={(e) => set({ ref: e.target.value })} /></Field>
      </div>
      <Field label="Stikord (hvornår skal der trykkes GO?)"><input className={inputCls} placeholder={tr("fx Efter guitarsolo")} value={cue.stikord ?? ""} onChange={(e) => set({ stikord: e.target.value })} /></Field>
      <Field label="Timecode-trigger (HH:MM:SS:FF, tom = fra)"><input className={inputCls + " font-mono"} placeholder="01:00:12:00" value={cue.tc ?? ""} onChange={(e) => set({ tc: e.target.value.replace(/[^0-9:;.]/g, "") })} /></Field>

      <div className="border-y border-border py-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-standby">{tr("Afvikling")}</div>
        {props.inGroup ? <Field label="Start efter gruppe-GO (sekunder, 0 = straks)"><Num value={cue.preWait} onChange={(n) => set({ preWait: Math.max(0, n) })} /></Field> : <>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pre-wait (s)" tip="Forsinkelse fra GO trykkes, til cuet starter"><Num value={cue.preWait} onChange={(n) => set({ preWait: Math.max(0, n) })} /></Field>
          <Field label="Post-wait (s)" tip="Ventetid før næste cue starter automatisk"><Num value={cue.postWait} onChange={(n) => set({ postWait: Math.max(0, n) })} /></Field>
        </div>
        <div className="mt-2">
          <Field label="Næste cue" tip="Manuel venter på GO; auto-follow starter næste cue af sig selv">
            <select className={inputCls} value={cue.follow} onChange={(e) => set({ follow: e.target.value })}>
              <option value="manual">{tr("Manuel – venter på GO")}</option>
              <option value="withStart">{tr("Auto-follow – når dette cue starter (+ post-wait)")}</option>
              <option value="afterEnd">{tr("Auto-follow – når dette cue slutter (+ post-wait)")}</option>
            </select>
          </Field>
        </div></>}
      </div>

      <Field label="Farve (kun dette cue)">
        <div className="flex items-center gap-2">
          {["#ef4444","#f59e0b","#eab308","#22c55e","#3b82f6","#a855f7","#ec4899"].map((col) => <button key={col} title={tr("Vælg farve")} onClick={() => set({ color: col })} className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: col }} />)}
          <input type="color" value={cueColor(show, cue)} onChange={(e) => set({ color: e.target.value })} className="h-8 w-14 cursor-pointer bg-transparent" />
          {cue.color && <button className="text-sm text-muted-foreground underline" onClick={() => set({ color: undefined })}>{tr("Brug type-farve")}</button>}
        </div>
      </Field>

      </>}
      {(props.guidedSection === "type" || tab === "type") && <>
      {cue.type === "audio" && (
        <>
          <Field label="Lydfil">
            <input type="file" accept="audio/*" className="text-sm" onChange={(e) => e.target.files?.[0] && props.onFile(e.target.files[0])} />
            <div className="mt-1 truncate text-xs text-muted-foreground">{cue.fileName || tr("Ingen fil valgt")}</div>
          </Field>
          <details className="rounded-lg border border-border bg-muted/30 p-2" open={props.guidedSection ? undefined : true}>
            <summary className="cursor-pointer select-none text-sm font-semibold">🎛️ {tr("Mixer")} <span className="text-xs font-normal text-muted-foreground">· {tr("trim, EQ, patch, fader")}</span></summary>
            <div className="mt-2 flex flex-col gap-3">
          <MixStrip cue={cue} set={set} tr={tr} />
          {cue.fileId && (
            <Field label="Waveform & trim (træk i markørerne)">
              <Waveform fileKey={cue.fileId} load={() => props.loadAudio(cue.fileId!, cue.outputId)} startTime={cue.startTime ?? 0} endTime={cue.endTime ?? 0} onChange={(p) => set(p)} />
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Field label="Start (s)"><Num value={cue.startTime ?? 0} step={0.05} min={0} onChange={(n) => set({ startTime: Math.max(0, n) })} /></Field>
                <Field label="Slut (s, 0 = filens slut)"><Num value={cue.endTime ?? 0} step={0.05} min={0} onChange={(n) => set({ endTime: Math.max(0, n) })} /></Field>
              </div>
              <div className="mt-1 flex gap-2">
                <Btn onClick={props.onFire}>▶ Afspil trim-udsnit</Btn>
                {(cue.startTime || cue.endTime) ? <button className="text-sm text-muted-foreground underline" onClick={() => set({ startTime: 0, endTime: 0 })}>{tr("Nulstil trim")}</button> : null}
              </div>
            </Field>
          )}
          {cue.fileId && cue.click && <ClickExport fileId={cue.fileId} name={cue.name} click={cue.click} />}
          {cue.fileId && <Field label="Forlyt (PFL) · Pro"><PflButton fileId={cue.fileId} allow={() => props.needPro("pfl")} play={props.pfl} stop={props.stopPfl} /></Field>}
          <Field label="Lydudgang">
            <select className={inputCls} value={cue.outputId} onChange={(e) => set({ outputId: e.target.value })}>
              {slots(show, "audio").length > 0 && <optgroup label={tr("Nummererede udgange")}>{slots(show, "audio").map((sl, i) => <option key={i} value={slotRef(i + 1)}>{slotLabel(i + 1, sl, "audio")}</option>)}</optgroup>}
              {outputs.map((o) => <option key={o.id} value={o.id}>{ioName(o.label, show.ioAliases?.audio?.[o.id])}</option>)}
              {!outputs.some((o) => o.id === cue.outputId) && !cue.outputId.startsWith("#") && <option value={cue.outputId}>{tr("(ukendt udgang – scan igen)")}</option>}
            </select>
          </Field>
          <ChannelPicker outputId={cue.outputId} channel={cue.channel ?? 1} mono={!!cue.mono} count={props.channelCount} aliases={show.ioAliases?.audio} {...(props.testTone ? { test: props.testTone } : {})} onChange={(ch, mono) => { if ((ch > 1 || mono) && !props.needPro("channels")) return; set({ channel: ch, mono }); }} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Volumen (dB)"><Num value={cue.volume} step={0.5} min={-60} max={12} onChange={(n) => set({ volume: n })} /></Field>
            <Field label={`Pan (${cue.pan.toFixed(2)})`}>
              <input type="range" min={-1} max={1} step={0.05} value={cue.pan} onChange={(e) => set({ pan: parseFloat(e.target.value) })} className="w-full accent-[var(--standby)]" />
            </Field>
            <Field label="Fade-in (s)"><Num value={cue.fadeIn} onChange={(n) => set({ fadeIn: Math.max(0, n) })} /></Field>
            <Field label="Fade-out (s)"><Num value={cue.fadeOut} onChange={(n) => set({ fadeOut: Math.max(0, n) })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cue.loop} onChange={(e) => set({ loop: e.target.checked })} /> {tr("Loop")}</label>
            </div>
          </details>
        </>
      )}

      {cue.type === "osc" && (
        <div className="flex flex-col gap-2">
          <select className={inputCls} value="" onChange={(e) => { const t = OSC_TEMPLATES[+e.target.value]; if (t) set({ port: t.port, address: t.address, args: t.args }); }}>
            <option value="">{tr("Skabelon…")}</option>
            {OSC_TEMPLATES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-1">
            <input className={inputCls + " col-span-2"} title="IP" value={cue.host} onChange={(e) => set({ host: e.target.value })} />
            <input className={inputCls} type="number" min={1} max={65535} title="Port" value={cue.port} onChange={(e) => set({ port: +e.target.value })} />
          </div>
          <input className={inputCls + " font-mono"} placeholder="/adresse" value={cue.address} onChange={(e) => set({ address: e.target.value })} />
          <input className={inputCls + " font-mono"} placeholder={tr("Værdier, fx 1 0.5 \"tekst\"")} value={cue.args} onChange={(e) => set({ args: e.target.value })} />
          <p className="text-[10px] text-muted-foreground">{tr("127.0.0.1 = programmer på samme PC (QLC+, Resolume, Reaper…). Kræver Windows-appen.")}</p>
          <Btn onClick={() => { void sendOsc(cue).then((err) => err && alert(err)); }}>{tr("Send test")}</Btn>
        </div>
      )}

      {cue.type === "midi" && (
        <div className="flex flex-col gap-2">
          {cue.messages.map((m, i) => {
            const upd = (p: Partial<MidiMsg>) => set({ messages: cue.messages.map((x) => (x.id === m.id ? { ...x, ...p } : x)) });
            return (
              <div key={m.id} className="rounded border border-border p-2">
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-muted-foreground">
                  {tr("Besked")} {i + 1}
                  <span className="flex gap-2">
                    <button className="text-go" onClick={() => props.onTestMidi(m)}>{tr("Send")}</button>
                    <button className="text-destructive" onClick={() => set({ messages: cue.messages.filter((x) => x.id !== m.id) })}>{tr("Fjern")}</button>
                  </span>
                </div>
                <select className={inputCls} value={m.port} onChange={(e) => upd({ port: e.target.value })}>
                  <option value="">{tr("Vælg port…")}</option>
                  {slots(show, "midi").length > 0 && <optgroup label={tr("Nummererede udgange")}>{slots(show, "midi").map((sl, i) => <option key={i} value={slotRef(i + 1)}>{slotLabel(i + 1, sl, "midi")}</option>)}</optgroup>}
                  {midiPorts.map((p) => <option key={p} value={p}>{ioName(p, show.ioAliases?.midi?.[p])}{isVirtualMidi(p) ? " · virtuel" : ""}</option>)}
                  {m.port && !midiPorts.includes(m.port) && !m.port.startsWith("#") && <option value={m.port}>{m.port} ({tr("ikke tilsluttet")})</option>}
                </select>
                {(() => { const k = midiKindInfo(m.kind); return (<>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  <select className={inputCls + " col-span-4"} value={m.kind} onChange={(e) => { const nk = midiKindInfo(e.target.value as MidiMsg["kind"]); upd({ kind: nk.kind, ...(nk.def1 != null ? { data1: nk.def1 } : {}) }); }}>
                    {MIDI_KINDS.map((x) => <option key={x.kind} value={x.kind}>{x.label}</option>)}
                  </select>
                  {k.channel && <input title={tr("Kanal")} type="number" min={1} max={16} className={inputCls} value={m.channel} onChange={(e) => upd({ channel: +e.target.value })} />}
                  {k.d1 && <input title={k.d1.label} type="number" min={0} max={k.d1.max} className={inputCls + (k.d1.max > 127 ? " col-span-2" : "")} value={m.data1} onChange={(e) => upd({ data1: +e.target.value })} />}
                  {k.d2 && <input title={k.d2.label} type="number" min={0} max={k.d2.max} className={inputCls} value={m.data2} onChange={(e) => upd({ data2: +e.target.value })} />}
                </div>
                <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
                  {k.channel && <span>{tr("Kanal")}</span>}{k.d1 && <span className={k.d1.max > 127 ? "col-span-2" : ""}>{k.d1.label}{k.d1.note ? ` (${noteName(m.data1)})` : ""}</span>}{k.d2 && <span>{k.d2.label}</span>}
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
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cue.stopAfter} onChange={(e) => set({ stopAfter: e.target.checked })} /> {tr("Stop efter fade")}</label>
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
      {cue.type === "dmx" && <DmxCueEditor cue={cue} show={show} set={(p) => set(p)} onFire={props.onFire} />}
      {cue.type === "memo" && (
        <Field label="Tekst (vises stort i standby)">
          <textarea rows={6} className={`${inputCls} font-mono`} value={cue.text} onChange={(e) => set({ text: e.target.value })} />
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">{tr("Indsæt tab:")}</span>
            {Object.entries(TAB_TUNINGS).map(([k, strs]) => <button key={k} type="button" onClick={() => set({ text: (cue.text ? cue.text + "\n\n" : "") + tabTemplate(strs) })} className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold hover:bg-accent">{k}</button>)}
          </div>
        </Field>
      )}
      {cue.type === "group" && <GroupEditor {...props} cue={cue} />}
      </>}
      {tab === "notes" && <>
      <MonitorNotes key={cue.id} cue={cue} monitors={show.monitors ?? []} onChange={onChange} />
      {props.onSaveDefault && <div className="flex flex-wrap items-center gap-2 rounded border border-dashed border-border p-2 text-xs">
        <span className="text-muted-foreground">{tr("Standard for nye cues af typen")} {tr(TYPE_LABEL[cue.type])}{show.cueDefaults?.[cue.type] ? ` (${tr("sat")})` : ""}:</span>
        <button type="button" onClick={() => props.onSaveDefault?.(cue)} className="rounded bg-secondary px-2 py-1 font-semibold hover:bg-accent">{tr("Gem dette cue som standard")}</button>
        {show.cueDefaults?.[cue.type] && <button type="button" onClick={() => props.onResetDefault?.(cue.type)} className="text-muted-foreground underline">{tr("Nulstil til fabriksindstillinger")}</button>}
      </div>}
      </>}
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
  const tr = useTrApp();
  return (
    <div className="rounded border-2 p-2" style={{ borderColor: cueColor(show, cue) }}>
      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-standby">{tr("Cues i gruppen · startes ved gruppe-GO (+ evt. forsinkelse)")}</div>
      <div className="flex flex-col gap-1">
        {cue.children.length === 0 && <div className="text-sm text-muted-foreground">{tr("Tom gruppe – tilføj cues nedenfor.")}</div>}
        {cue.children.map((c, i) => (
          <div key={c.id} className={`flex items-center gap-1 rounded border-l-4 px-2 py-1 text-sm ${sel === c.id ? "bg-accent" : "bg-secondary"}`} style={{ borderLeftColor: cueColor(show, c) }}>
            <button className="min-w-0 flex-1 truncate text-left font-semibold" onClick={() => setSel(c.id)}>{i + 1}. {c.name}{c.preWait ? ` · +${c.preWait}s ${tr("efter GO")}` : ` · ${tr("straks")}`}</button>
            <button title={tr("Op")} onClick={() => move(i, -1)}>▲</button>
            <button title={tr("Ned")} onClick={() => move(i, 1)}>▼</button>
            <button title={tr("Fjern")} className="text-destructive" onClick={() => { setKids(cue.children.filter((x) => x.id !== c.id)); if (sel === c.id) setSel(null); }}>✕</button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {CHILD_TYPES.map((t) => (
          <button key={t} onClick={() => { const n = newCue(t, show.cueDefaults); trackFeature(`cue.${t}`); setKids([...cue.children, n]); setSel(n.id); }} className="rounded border-l-4 bg-secondary px-2 py-1 text-xs font-semibold hover:bg-accent" style={{ borderLeftColor: show.typeColors[t] || DEFAULT_TYPE_COLORS[t] }}>+ {tr(TYPE_LABEL[t])}</button>
        ))}
      </div>
      {child && (
        <div className="mt-3 rounded border border-border p-2">
          <div className="mb-2 text-xs font-bold text-muted-foreground">{tr("Redigerer:")} {child.name} </div>
          <Inspector
            {...props}
            key={child.id}
            inGroup
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

function BusSection({ show, setShow, outputs }: { show: Show; setShow: (s: Show) => void; outputs: Output[] }) {
  const tr = useTrApp();
  const sel = "min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-sm";
  const row = (label: string, tip: string, out: "paOut" | "pflOut", chKey: "paCh" | "pflCh", withCh: boolean) => (
    <div className="flex flex-wrap items-center gap-2 border-b border-border py-1.5" title={tip}>
      <span className="w-32 shrink-0 text-sm font-semibold">{tr(label)}</span>
      <select className={sel} value={show[out] ?? ""} onChange={(e) => setShow({ ...show, [out]: e.target.value })}>
        <option value="">{tr("Windows standard")}</option>
        {slots(show, "audio").length > 0 && <optgroup label={tr("Nummererede udgange")}>{slots(show, "audio").map((sl, i) => <option key={i} value={slotRef(i + 1)}>{slotLabel(i + 1, sl, "audio")}</option>)}</optgroup>}
        {outputs.map((o) => <option key={o.id} value={o.id}>{ioName(o.label, show.ioAliases?.audio?.[o.id])}</option>)}
      </select>
      {withCh && <label className="flex items-center gap-1 text-sm">Ch <input type="number" min={1} max={32} className="w-16 rounded border border-border bg-background px-2 py-1 text-sm" value={show[chKey] ?? 1} onChange={(e) => setShow({ ...show, [chKey]: Math.max(1, Math.min(32, Number(e.target.value) || 1)) })} /></label>}
    </div>
  );
  return (
    <div className="mb-4">
      <div className="mb-1 text-sm font-semibold">{tr("PA og PAFL")}</div>
      {row("PA (standard)", "Cues uden valgt lydudgang spiller her", "paOut", "paCh", false)}
      {row("PAFL / forlyt", "Forlyt-knappen i cue-editoren spiller her, fx dine høretelefoner", "pflOut", "pflCh", true)}
    </div>
  );
}

function PatchSection({ show, setShow, midiPorts, outputs }: { show: Show; setShow: (s: Show) => void; midiPorts: string[]; outputs: Output[] }) {
  const setList = (kind: PatchKind, list: PatchSlot[]) => setShow({ ...show, patch: { ...show.patch, [kind]: list } });
  const sel = "min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-sm";
  const block = (kind: PatchKind) => {
    const list = slots(show, kind);
    const hwOpts = kind === "audio" ? outputs.map((o) => ({ id: o.id, label: o.label })) : midiPorts.map((p) => ({ id: p, label: isVirtualMidi(p) ? `${p} · virtuel (samme PC)` : p }));
    const upd = (i: number, p: Partial<PatchSlot>) => setList(kind, list.map((x, j) => (j === i ? { ...x, ...p } : x)));
    return (
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-sm font-semibold">
          <span>{kind === "audio" ? "Lydudgange" : "MIDI-udgange"}</span>
          <button className="text-go" onClick={() => setList(kind, [...list, { alias: "", hw: "" }])}>+ {kind === "audio" ? "Lyd" : "MIDI"} {list.length + 1}</button>
        </div>
        {list.length === 0 && <p className="text-xs text-muted-foreground">Ingen numre endnu.</p>}
        {list.map((sl, i) => {
          const resolved = resolveOut(show, kind, slotRef(i + 1), kind === "audio" ? outputs : undefined);
          const found = hwOpts.some((o) => o.id === resolved);
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 border-b border-border py-1.5">
              <span className="w-16 shrink-0 font-mono text-sm font-bold">{kind === "audio" ? "Lyd" : "MIDI"} {i + 1}</span>
              <input className="w-40 rounded border border-border bg-background px-2 py-1 text-sm" placeholder="Bruges til, fx In-ear" value={sl.alias} onChange={(e) => upd(i, { alias: e.target.value })} />
              <select className={sel} value={found ? resolved : "__missing"} onChange={(e) => { const o = hwOpts.find((x) => x.id === e.target.value); upd(i, { hw: e.target.value, hwLabel: o?.label ?? (e.target.value ? e.target.value : "Standard") }); }}>
                {!found && <option value="__missing">⚠ {sl.hwLabel || sl.hw || "Vælg hardware…"} (ikke fundet på denne PC)</option>}
                {hwOpts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              {i === list.length - 1 && <button className="text-xs text-destructive" title="Fjern sidste nummer" onClick={() => setList(kind, list.slice(0, -1))}>✕</button>}
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <Section title="Udgange med numre (følger showet)" action={<Btn onClick={() => setShow(numberExisting(show, Object.fromEntries(outputs.map((o) => [o.id, o.label]))))}>Giv eksisterende cues numre</Btn>}>
      <p className="mb-2 text-xs text-muted-foreground">Cues sender til et nummer, fx "Lyd 2" eller "MIDI 1". Skifter du computer, vælger du bare hardwaren her én gang – alle cues følger med. Teksten "Bruges til" gemmes i showet.</p>
      {block("audio")}
      {block("midi")}
      <details className="mt-2 rounded border border-border p-2 text-xs">
        <summary className="cursor-pointer font-semibold">Intern MIDI: styr programmer på samme PC ({midiPorts.filter(isVirtualMidi).length ? `✅ ${midiPorts.filter(isVirtualMidi).join(", ")}` : "⚠ ingen virtuel port fundet"})</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Nemmest: brug et <b>OSC-cue</b> til 127.0.0.1 – virker med QLC+, Resolume, GrandMA og Reaper uden ekstra program.</li>
          <li>Skal det være MIDI: installér det gratis program <a className="underline" href="https://www.tobias-erichsen.de/software/loopmidi.html" target="_blank" rel="noreferrer">loopMIDI</a> og opret en port.</li>
          <li>Porten dukker op her markeret "virtuel". Vælg den som MIDI-udgang og som MIDI-indgang i det andet program.</li>
        </ol>
      </details>
    </Section>
  );
}

type SetTab = "audio" | "midi" | "patch" | "prefs" | "monitors" | "look" | "dmx" | "general";
const SET_TABS: [SetTab, string][] = [["audio", "🔊 Lyd"], ["midi", "🎹 MIDI"], ["patch", "🔀 Patch-matrix"], ["prefs", "⚙️ Preferences"], ["monitors", "📱 Scenemonitors"], ["look", "🎨 Udseende"], ["dmx", "💡 DMX / Lys"], ["general", "💾 Generelt & Panic"]];
const PREF_SKIP = new Set(["id", "type", "messages", "children", "fileId", "fileName", "monitorNotes", "number", "ref", "startTime", "endTime", "outputId", "target", "targetId"]);
const PREF_LABEL: Record<string, string> = { name: "Navn", follow: "Efter cue", preWait: "Pre-wait (s)", postWait: "Post-wait (s)", volume: "Volumen (dB)", pan: "Pan", fadeIn: "Fade ind (s)", fadeOut: "Fade ud (s)", loop: "Loop", duration: "Varighed (s)", channel: "Kanal", host: "IP", port: "Port", address: "Adresse" };
/** Default MIDI messages for new MIDI cues: type, channel and data values. */
function MidiPref({ msgs, onChange }: { msgs: MidiMsg[]; onChange: (m: MidiMsg[]) => void }) {
  const tr = useTrApp();
  const set = (i: number, p: Partial<MidiMsg>) => onChange(msgs.map((m, j) => (j === i ? { ...m, ...p } : m)));
  return <div className="mt-3 flex flex-col gap-2">
    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tr("MIDI-beskeder")}</div>
    {msgs.map((m, i) => { const info = midiKindInfo(m.kind); return (
      <div key={i} className="flex flex-wrap items-end gap-2 rounded border border-border p-2">
        <Field label={tr("Type")}><select className={inputCls} value={m.kind} onChange={(e) => { const k = midiKindInfo(e.target.value as MidiKind); set(i, { kind: k.kind, data1: k.def1 ?? m.data1, data2: k.def2 ?? m.data2 }); }}>{MIDI_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}</select></Field>
        {info.channel && <Field label={tr("Kanal")}><Num value={m.channel} onChange={(n) => set(i, { channel: Math.max(1, Math.min(16, n)) })} /></Field>}
        {info.d1 && <Field label={`${tr(info.d1.label)}${info.d1.note ? ` (${noteName(m.data1)})` : ""}`}><Num value={m.data1} onChange={(n) => set(i, { data1: Math.max(0, Math.min(info.d1!.max, n)) })} /></Field>}
        {info.d2 && <Field label={tr(info.d2.label)}><Num value={m.data2} onChange={(n) => set(i, { data2: Math.max(0, Math.min(info.d2!.max, n)) })} /></Field>}
        {msgs.length > 1 && <Btn onClick={() => onChange(msgs.filter((_, j) => j !== i))}>✕</Btn>}
      </div>); })}
    <Btn onClick={() => onChange([...msgs, newMidiMsg()])}>+ {tr("Tilføj besked")}</Btn>
  </div>;
}
/** Preferences: starting values for every new cue, per cue type. Saved in the show. */
function PrefsSection({ show, setShow }: { show: Show; setShow: (s: Show) => void }) {
  const tr = useTrApp();
  const setVal = (t: CueType, k: string, v: unknown) => setShow({ ...show, cueDefaults: { ...show.cueDefaults, [t]: { ...cueAsDefault(newCue(t, show.cueDefaults)), [k]: v } } });
  return <>
    <p className="mb-4 text-sm text-muted-foreground">{tr("Værdierne her bruges, når du opretter et nyt cue. De gemmes i showet.")}</p>
    {TYPES.map((t) => { const c = newCue(t, show.cueDefaults) as unknown as Record<string, unknown>; const keys = Object.keys(c).filter((k) => !PREF_SKIP.has(k) && ["number", "boolean", "string"].includes(typeof c[k]));
      return <Section key={t} title={tr(TYPE_LABEL[t])} action={show.cueDefaults?.[t] ? <Btn onClick={() => { const d = { ...show.cueDefaults }; delete d[t]; setShow({ ...show, cueDefaults: d }); }}>{tr("Nulstil")}</Btn> : undefined}>
        <div className="grid grid-cols-2 gap-2">{keys.map((k) => { const v = c[k]; const label = tr(PREF_LABEL[k] ?? k);
          if (typeof v === "boolean") return <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v} onChange={(e) => setVal(t, k, e.target.checked)} />{label}</label>;
          if (k === "follow") return <Field key={k} label={label}><select className={inputCls} value={String(v)} onChange={(e) => setVal(t, k, e.target.value)}><option value="manual">{tr("Manuel")}</option><option value="withStart">{tr("Start sammen med")}</option><option value="afterEnd">{tr("Efter slut")}</option></select></Field>;
          if (typeof v === "number") return <Field key={k} label={label}><Num value={v} onChange={(n) => setVal(t, k, n)} /></Field>;
          return <Field key={k} label={label}><input className={inputCls} value={String(v)} onChange={(e) => setVal(t, k, e.target.value)} /></Field>; })}</div>
        {t === "midi" && <MidiPref msgs={(c["messages"] as MidiMsg[]) ?? []} onChange={(m) => setVal(t, "messages", m)} />}
      </Section>; })}
  </>;
}

function Settings(props: {
  show: Show; setShow: (s: Show) => void; midiPorts: string[]; midiIns: string[]; outputs: Output[]; onClose: () => void;
  onScanMidi: () => void; onScanAudio: () => void; onTestMidi: (port: string) => void;
  autoSaveMin: number; setAutoSaveMin: (n: number) => void; pro: boolean;
}) {
  const { show, setShow } = props;
  const [sync, setSync] = useState(cloudSyncOn);
  const [tab, setTab] = useState<SetTab>("audio");
  const tr = useTrApp();
  const setAlias = (kind: "audio" | "midi", key: string, v: string) => {
    const cur = { ...(show.ioAliases?.[kind] ?? {}) };
    if (v) cur[key] = v; else delete cur[key];
    setShow({ ...show, ioAliases: { ...show.ioAliases, [kind]: cur } });
  };
  const aliasInput = (kind: "audio" | "midi", key: string) => (
    <input className="w-44 rounded border border-border bg-background px-2 py-1 text-sm" placeholder="Kaldenavn, fx Headphones" title="Dit eget navn for porten – gemmes i showet" value={show.ioAliases?.[kind]?.[key] ?? ""} onChange={(e) => setAlias(kind, key, e.target.value)} />
  );
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-background/80 p-6" onClick={props.onClose}>
      <div className="show-settings flex h-[85vh] w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-card" onClick={(e) => e.stopPropagation()}>
        <nav className="flex w-52 shrink-0 flex-col border-r border-border bg-background p-3">
          {SET_TABS.map(([k, label]) => <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined} className={`border-b border-l-2 border-b-border px-3 py-3 text-left text-sm font-semibold ${tab === k ? "border-l-standby bg-secondary text-foreground" : "border-l-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{tr(label)}</button>)}
        </nav>
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
          <h2 className="text-2xl font-bold">{tr(SET_TABS.find((t) => t[0] === tab)![1])}</h2>
          <Btn onClick={props.onClose}>Luk</Btn>
        </div>

        {tab === "general" && <>
        <Section title="Gem automatisk til fil">
          <label className="flex items-center gap-2 text-sm">Gem hvert
            <input type="number" min={0} max={999} className="w-20 rounded border border-border bg-background px-2 py-1 text-sm" value={props.autoSaveMin} onChange={(e) => props.setAutoSaveMin(Math.max(0, Math.min(999, Math.floor(Number(e.target.value) || 0))))} />
            minut (0 = fra)</label>
          <p className="mt-1 text-xs text-muted-foreground">Gemmer til den fil, du har valgt med "Gem som…".</p>
        </Section>
        <Section title="☁️ Sky-backup (Pro)">
          {props.pro ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sync} onChange={(e) => { setCloudSync(e.target.checked); setSync(e.target.checked); }} />{tr("Gem også en kopi i skyen, så showet kan åbnes på andre computere")}</label>
            : <p className="text-sm text-muted-foreground">{tr("Sky-backup kræver Pro. Shows gemmes altid lokalt på denne computer.")} <a href="/priser" target="_blank" rel="noreferrer" className="font-semibold text-standby underline">{tr("Opgrader")}</a></p>}
        </Section>
        <Section title="Panic">
          <Field label="Nød-fade tid (s, 0 = øjeblikkelig)"><Num value={show.panicFade} onChange={(n) => setShow({ ...show, panicFade: Math.max(0, n) })} /></Field>
        </Section>
        <p className="text-xs text-muted-foreground">Lydfiler gemmes i browseren på denne computer. Show-filen (JSON) indeholder kun filnavne – på en ny computer skal lydfilerne vælges igen. Brug "Backup m. lyd" for at få alt med i én fil.</p>
        </>}
        {tab === "dmx" && <DmxSettingsSection show={show} setShow={setShow} />}
        {tab === "monitors" && <div className="mb-5"><MonitorProfiles show={show} onChange={setShow} /></div>}
        {tab === "audio" && <>
        <div className="mb-5 flex items-center gap-3 rounded border border-border bg-muted/30 p-3 text-xs text-muted-foreground"><img src="/asio-compatible.svg" alt="ASIO compatible" className="h-8 w-auto" /><span>ASIO Technology by Steinberg Media Technologies GmbH. ASIO is a trademark of Steinberg Media Technologies GmbH, registered in Europe and other countries.</span></div>
        <BusSection show={show} setShow={setShow} outputs={props.outputs} />
        <Section title="Lydudgange" action={<Btn onClick={props.onScanAudio}>Scan enheder</Btn>}>
          {props.outputs.map((o) => <div key={o.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm"><span className="min-w-0 flex-1 truncate">{o.label}</span>{aliasInput("audio", o.id)}</div>)}
        </Section>
        </>}
        {tab === "patch" && <PatchSection show={show} setShow={setShow} midiPorts={props.midiPorts} outputs={props.outputs} />}
        {tab === "prefs" && <PrefsSection show={show} setShow={setShow} />}
        {tab === "midi" && <>
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

        </>}
        {tab === "look" && <>
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

        </>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-5 border-b border-border pb-5 last:mb-0 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase text-standby">{title}</h3>
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
  const tr = useTrApp();
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="shrink-0 font-mono text-[clamp(0.75rem,3.5cqw,1.125rem)] font-bold text-muted-foreground">{tr("SANG")} {songIdx >= 0 ? songIdx + 1 : "–"}/{show.songs.length}</span>
        <span className="min-w-0 flex-1 break-words text-[clamp(1.1rem,7cqw,2.25rem)] font-black uppercase leading-tight">{song?.name ?? tr("Slut på show")}</span>
      </div>
      {standby ? (
        <div className="rounded-lg border-l-[12px] bg-muted px-4 py-3" style={{ borderLeftColor: cueColor(show, standby) }}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[clamp(0.65rem,2.8cqw,0.875rem)] font-bold uppercase tracking-widest text-standby">
            <span>{tr("Næste GO")} · cue {cueInSong}/{song?.cues.length}</span>
            <TypeTag show={show} cue={standby} />
            {standby.preWait > 0 && <span className="text-muted-foreground">pre-wait {standby.preWait}s</span>}
          </div>
          <div className="break-words text-[clamp(1.25rem,9cqw,3rem)] font-black leading-tight">{standby.name}</div>
          {standby.stikord && <div className={"mt-2 break-words rounded px-3 py-2 text-[clamp(1rem,6cqw,1.875rem)] font-black text-standby " + (props.warn ? "animate-pulse bg-standby/40 ring-4 ring-standby" : "bg-standby/15")}>⏱ {standby.stikord}</div>}
          {standby.type === "memo" && standby.text && <div className="mt-1 whitespace-pre-wrap text-[clamp(0.9rem,5cqw,1.5rem)] text-memo">{standby.text}</div>}
        </div>
      ) : (
        <div className="rounded-lg bg-muted px-4 py-6 text-[clamp(1rem,6cqw,1.875rem)] font-bold text-muted-foreground">{tr("Ingen flere cues")}</div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tr("Noter til næste cue")}</span>
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
        placeholder={tr("Skriv noter til dette cue…")}
        className={`min-h-0 flex-1 resize-none rounded-md border border-border bg-background p-3 font-semibold leading-snug text-memo outline-none focus:border-standby ${NOTE_SIZES[props.size]}`}
      />
      <div className="break-words border-t border-border pt-2 text-[clamp(0.8rem,3.5cqw,1.125rem)] text-muted-foreground">
        {tr("Derefter:")} {after ? <><span className="font-bold text-foreground">{after.name}</span>{afterSong && afterSong !== song && <span className="ml-2 text-standby">→ {tr("ny sang:")} {afterSong.name}</span>}</> : "—"}
      </div>
    </div>
  );
}

function PedalPanel(props: {
  map: PedalMap; learning: PedalAction | null; last: MidiIn | null;
  onLearn: (a: PedalAction | null) => void; onClear: (a: PedalAction) => void;
}) {
  const tr = useTrApp();
  const lbl = (m?: MidiIn) => tr(midiInLabel(m));
  return (
    <div className="flex flex-col gap-2 p-3 text-sm">
      <p className="text-muted-foreground">{tr('Tryk "Lær" og aktivér en knap, pedal eller tangent på din MIDI-controller.')}</p>
      {(Object.keys(PEDAL_LABEL) as PedalAction[]).map((a) => (
        <div key={a} className="flex items-center gap-2 rounded bg-muted px-2 py-1.5">
          <span className="w-24 font-bold">{tr(PEDAL_LABEL[a])}</span>
          <span className="flex-1 font-mono text-xs text-muted-foreground">{props.learning === a ? tr("Venter på pedal…") : lbl(props.map[a])}</span>
          <button onClick={() => props.onLearn(props.learning === a ? null : a)} className={`rounded px-2 py-1 text-xs font-bold ${props.learning === a ? "bg-standby text-background" : "bg-secondary"}`}>{props.learning === a ? tr("Annullér") : tr("Lær")}</button>
          {props.map[a] && <button onClick={() => props.onClear(a)} className="px-1 text-muted-foreground hover:text-destructive" aria-label={tr("Fjern")}>✕</button>}
        </div>
      ))}
      <div className="font-mono text-xs text-muted-foreground">{tr("Sidst modtaget:")} {props.last ? lbl(props.last) : tr("intet")}</div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100000] flex backdrop-blur-sm items-center justify-center bg-background/70 p-4" onClick={onClose}>
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

function PflButton({ fileId, allow, play, stop }: { fileId: string; allow: () => boolean; play: (f: string, end: () => void) => void; stop: () => void }) {
  const [on, setOn] = useState(false);
  const stopRef = useRef(stop); stopRef.current = stop;
  // Stop only when this cue's button unmounts or the file changes – not on every re-render.
  useEffect(() => () => stopRef.current(), [fileId]);
  const toggle = () => {
    if (on) { stop(); setOn(false); return; }
    if (!allow()) return;
    setOn(true);
    play(fileId, () => setOn(false));
  };
  return <button title="Lyt til filen på PAFL-udgangen (vælges i Indstillinger) uden at starte cuet" onClick={toggle} className={`rounded px-3 py-1.5 text-sm font-bold ${on ? "bg-standby text-background" : "bg-secondary"}`}>{on ? "⏹ Stop forlyt" : "🎧 Forlyt"}</button>;
}

function ChannelPicker({ outputId, channel, mono, count, aliases, test, onChange }: { outputId: string; channel: number; mono: boolean; count: (o: string) => Promise<number>; aliases?: Record<string, string> | undefined; test?: (o: string, ch: number, mono: boolean) => void; onChange: (ch: number, mono: boolean) => void }) {
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
        {test && <button type="button" title="Afspil 1 sekunds testtone på de valgte kanaler" onClick={() => test(outputId, channel, mono)} className="rounded bg-secondary px-2 py-1 text-sm font-bold">🔊 Test</button>}
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

function cueMatches(c: Cue, q: string, pos: number): boolean {
  const hay = [c.name, c.number ?? String(pos), c.stikord, c.notes, c.ref, c.type === "memo" ? c.text : "", ...Object.values(c.monitorNotes ?? {})];
  if (c.type === "group") return hay.some((h) => h?.toLowerCase().includes(q)) || c.children.some((k) => cueMatches(k, q, pos));
  return hay.some((h) => h?.toLowerCase().includes(q));
}
