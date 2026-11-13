import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TYPE_COLORS, TYPE_LABEL, cueColor, emptyShow, newCue, newMidiMsg, parseShow, uid, MIDI_KINDS, midiKindInfo, noteName } from "@/lib/show/logic";
import type { Cue, CueType, Follow, MidiMsg, Show } from "@/lib/show/types";
import { MonitorNotes } from "./MonitorNotes";

const TYPES: CueType[] = ["audio", "midi", "fade", "stop", "pause", "wait", "memo", "group"];
const CHILD_TYPES: CueType[] = ["audio", "midi", "fade", "stop", "pause", "wait", "memo"];
const FOLLOW: Record<Follow, string> = { manual: "Manuel GO", withStart: "Auto ved start", afterEnd: "Auto ved slut" };

/** Phone-friendly show editor. Saves to the cloud and, when connected, pushes live to the PC. */
export function MobileBuilder({ showId, connected, push, ports, testMidi }: { showId: string; connected: boolean; push: (s: Show) => void; ports: string[]; testMidi: (m: MidiMsg) => void }) {
  const [show, setShow] = useState<Show | null>(null);
  const [songId, setSongId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saved, setSaved] = useState<"ok" | "saving" | "error">("ok");
  const dirty = useRef(false);
  const pushRef = useRef(push);
  pushRef.current = push;

  useEffect(() => {
    supabase.from("shows").select("name,data").eq("id", showId).single().then(({ data }) => {
      if (!data) return;
      let s: Show;
      try { s = parseShow(JSON.stringify({ ...emptyShow(), ...(data.data as object), name: data.name })); } catch { s = { ...emptyShow(), name: data.name }; }
      setShow(s);
      setSongId(s.songs[0]?.id ?? null);
    });
  }, [showId]);

  useEffect(() => {
    if (!show || !dirty.current) return;
    setSaved("saving");
    const t = setTimeout(async () => {
      if (connected) pushRef.current(show);
      const { error } = await supabase.from("shows").update({ name: show.name, data: show as never, updated_at: new Date().toISOString() }).eq("id", showId);
      setSaved(error ? "error" : "ok");
    }, 600);
    return () => clearTimeout(t);
  }, [show, showId, connected]);

  if (!show) return <div className="p-6 text-center text-muted-foreground">Henter show…</div>;

  const edit = (f: (s: Show) => Show) => { dirty.current = true; setShow((s) => (s ? f(s) : s)); };
  const song = show.songs.find((s) => s.id === songId) ?? show.songs[0];
  const updSong = (id: string, f: (cues: Cue[]) => Cue[], name?: string) =>
    edit((s) => ({ ...s, songs: s.songs.map((sg) => (sg.id === id ? { ...sg, name: name ?? sg.name, cues: f(sg.cues) } : sg)) }));
  const updCue = (id: string, p: Partial<Cue>) => song && updSong(song.id, (cs) => cs.map((c) => (c.id === id ? ({ ...c, ...p } as Cue) : c)));
  const addSong = () => { const id = uid(); edit((s) => ({ ...s, songs: [...s.songs, { id, name: `Sang ${s.songs.length + 1}`, cues: [] }] })); setSongId(id); };
  const delSong = () => { if (!song || !confirm(`Slet sangen "${song.name}" og alle dens cues?`)) return; edit((s) => ({ ...s, songs: s.songs.filter((x) => x.id !== song.id) })); setSongId(null); };
  const moveSongBy = (d: number) => edit((s) => {
    const i = s.songs.findIndex((x) => x.id === song?.id); const j = i + d;
    if (i < 0 || j < 0 || j >= s.songs.length) return s;
    const a = [...s.songs]; [a[i], a[j]] = [a[j]!, a[i]!]; return { ...s, songs: a };
  });
  const addCue = (t: CueType) => { if (!song) return; const c = newCue(t); updSong(song.id, (cs) => [...cs, c]); setEditId(c.id); };
  const moveCueBy = (id: string, d: number) => song && updSong(song.id, (cs) => {
    const i = cs.findIndex((c) => c.id === id); const j = i + d;
    if (j < 0 || j >= cs.length) return cs;
    const a = [...cs]; [a[i], a[j]] = [a[j]!, a[i]!]; return a;
  });

  const inp = "h-12 w-full rounded-lg bg-input px-3 text-base outline-none";

  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex items-center gap-2">
        <input value={show.name} onChange={(e) => edit((s) => ({ ...s, name: e.target.value }))} className={inp + " font-bold"} aria-label="Show navn" />
      </div>
      <div className="text-xs text-muted-foreground">
        {saved === "saving" ? "Gemmer…" : saved === "error" ? "⚠ Ikke gemt" : "✓ Gemt i skyen"} · {connected ? "sendes live til pulten" : "pulten opdateres næste gang den åbner showet"}
      </div>

      <div className="rounded-xl bg-card p-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Sang</div>
        <div className="flex gap-2">
          <select value={song?.id ?? ""} onChange={(e) => { setSongId(e.target.value); setEditId(null); }} className={inp + " min-w-0 flex-1 font-bold"}>
            {show.songs.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.name}</option>)}
          </select>
          <button onClick={addSong} className="h-12 shrink-0 rounded-lg bg-go px-4 font-bold text-go-foreground">+ Sang</button>
        </div>
        {song && (
          <div className="mt-2 flex gap-2">
            <input value={song.name} onChange={(e) => updSong(song.id, (c) => c, e.target.value)} className={inp + " min-w-0 flex-1"} aria-label="Sangnavn" />
            <button onClick={() => moveSongBy(-1)} className="h-12 w-11 rounded-lg bg-secondary font-bold">▲</button>
            <button onClick={() => moveSongBy(1)} className="h-12 w-11 rounded-lg bg-secondary font-bold">▼</button>
            <button onClick={delSong} className="h-12 w-11 rounded-lg bg-secondary text-destructive">✕</button>
          </div>
        )}
      </div>

      {song?.cues.map((c, i) => {
        const open = editId === c.id;
        return (
          <div key={c.id} className={`rounded-xl bg-card ${open ? "outline outline-2 outline-standby" : ""}`}>
            <button onClick={() => setEditId(open ? null : c.id)} className="flex w-full items-center gap-2 p-3 text-left">
              <span className="h-8 w-1.5 shrink-0 rounded" style={{ background: cueColor(show, c) }} />
              <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold">{c.name}</span>
                <span className="text-xs text-muted-foreground">{TYPE_LABEL[c.type]} · {FOLLOW[c.follow]}{c.notes ? " · 📝" : ""}</span>
              </span>
              <span className="text-muted-foreground">{open ? "▴" : "▾"}</span>
            </button>
            {open && (
              <div className="flex flex-col gap-2 border-t border-border p-3">
                <label className="text-xs font-bold text-muted-foreground">Navn</label>
                <input value={c.name} onChange={(e) => updCue(c.id, { name: e.target.value })} className={inp} />
                <MonitorNotes cue={c} monitors={show.monitors ?? []} onChange={(p) => updCue(c.id, p)} />
                {c.type === "memo" && (<>
                  <label className="text-xs font-bold text-muted-foreground">Memo-tekst</label>
                  <textarea value={c.text} onChange={(e) => updCue(c.id, { text: e.target.value } as Partial<Cue>)} rows={3} className="w-full rounded-lg bg-input p-3 text-base outline-none" />
                </>)}
                {(c.type === "wait" || c.type === "fade" || c.type === "stop") && (<>
                  <label className="text-xs font-bold text-muted-foreground">Varighed (s)</label>
                  <input type="number" inputMode="decimal" step="0.1" value={c.duration} onChange={(e) => updCue(c.id, { duration: Math.max(0, Number(e.target.value) || 0) } as Partial<Cue>)} className={inp} />
                </>)}
                {c.type === "midi" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted-foreground">MIDI-beskeder</label>
                    {c.messages.map((m, mi) => {
                      const k = midiKindInfo(m.kind);
                      const setMsgs = (msgs: MidiMsg[]) => updCue(c.id, { messages: msgs } as Partial<Cue>);
                      const upd = (p: Partial<MidiMsg>) => setMsgs(c.messages.map((x) => (x.id === m.id ? { ...x, ...p } : x)));
                      const num = (v: string, max: number) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));
                      return (
                        <div key={m.id} className="flex flex-col gap-2 rounded-lg border border-border p-2">
                          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                            Besked {mi + 1}
                            <span className="flex gap-3">
                              <button disabled={!connected} onClick={() => testMidi(m)} className="text-go disabled:opacity-30">▶ Send test</button>
                              <button onClick={() => setMsgs(c.messages.filter((x) => x.id !== m.id))} className="text-destructive">Fjern</button>
                            </span>
                          </div>
                          {ports.length > 0 ? (
                            <select value={m.port} onChange={(e) => upd({ port: e.target.value })} className={inp}>
                              <option value="">Vælg port…</option>
                              {ports.map((p) => <option key={p} value={p}>{p}</option>)}
                              {m.port && !ports.includes(m.port) && <option value={m.port}>{m.port} (ikke tilsluttet)</option>}
                            </select>
                          ) : (
                            <input value={m.port} onChange={(e) => upd({ port: e.target.value })} placeholder="Port-navn (forbind til pult for liste)" className={inp} />
                          )}
                          <select value={m.kind} onChange={(e) => { const nk = midiKindInfo(e.target.value as MidiMsg["kind"]); upd({ kind: nk.kind, ...(nk.def1 != null ? { data1: nk.def1 } : {}) }); }} className={inp + " font-bold"}>
                            {MIDI_KINDS.map((x) => <option key={x.kind} value={x.kind}>{x.label}</option>)}
                          </select>
                          <div className="grid grid-cols-3 gap-2">
                            {k.channel && <div><label className="text-xs text-muted-foreground">Kanal</label>
                              <input type="number" inputMode="numeric" min={1} max={16} value={m.channel} onChange={(e) => upd({ channel: Math.min(16, Math.max(1, Math.round(Number(e.target.value) || 1))) })} className={inp} /></div>}
                            {k.d1 && <div className={k.d1.max > 127 ? "col-span-2" : ""}><label className="text-xs text-muted-foreground">{k.d1.label}{k.d1.note ? ` · ${noteName(m.data1)}` : ""}</label>
                              <input type="number" inputMode="numeric" min={0} max={k.d1.max} value={m.data1} onChange={(e) => upd({ data1: num(e.target.value, k.d1!.max) })} className={inp} /></div>}
                            {k.d2 && <div><label className="text-xs text-muted-foreground">{k.d2.label}</label>
                              <input type="number" inputMode="numeric" min={0} max={k.d2.max} value={m.data2} onChange={(e) => upd({ data2: num(e.target.value, k.d2!.max) })} className={inp} /></div>}
                          </div>
                          {!k.channel && <div className="text-xs text-muted-foreground">Systembesked – ingen kanal eller værdier.</div>}
                        </div>
                      );
                    })}
                    <button onClick={() => updCue(c.id, { messages: [...c.messages, newMidiMsg()] } as Partial<Cue>)} className="h-11 rounded-lg bg-secondary font-bold">+ Tilføj MIDI-besked</button>
                  </div>
                )}
                {c.type === "group" && (
                  <div className="flex flex-col gap-2 rounded-lg border-2 p-2" style={{ borderColor: cueColor(show, c) }}>
                    <label className="text-xs font-bold text-muted-foreground">Cues i gruppen (starter samtidig)</label>
                    {c.children.map((k, ki) => {
                      const setKids = (children: Cue[]) => updCue(c.id, { children } as Partial<Cue>);
                      const updK = (p: Partial<Cue>) => setKids(c.children.map((x) => (x.id === k.id ? ({ ...x, ...p } as Cue) : x)));
                      const mv = (d: number) => { const j = ki + d; if (j < 0 || j >= c.children.length) return; const a = [...c.children]; [a[ki], a[j]] = [a[j]!, a[ki]!]; setKids(a); };
                      return (
                        <div key={k.id} className="flex flex-col gap-1 rounded-lg border-l-4 bg-secondary p-2" style={{ borderLeftColor: cueColor(show, k) }}>
                          <div className="flex items-center gap-2">
                            <input value={k.name} onChange={(e) => updK({ name: e.target.value })} className={inp + " flex-1"} />
                            <button onClick={() => mv(-1)} className="h-11 w-9 rounded bg-background">▲</button>
                            <button onClick={() => mv(1)} className="h-11 w-9 rounded bg-background">▼</button>
                            <button onClick={() => setKids(c.children.filter((x) => x.id !== k.id))} className="h-11 w-9 rounded bg-destructive text-destructive-foreground">✕</button>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {TYPE_LABEL[k.type]} · Pre-wait (s)
                            <input type="number" inputMode="decimal" step="0.1" value={k.preWait} onChange={(e) => updK({ preWait: Math.max(0, Number(e.target.value) || 0) })} className={inp + " w-24"} />
                          </div>
                          {k.type === "midi" && k.messages.map((m) => (
                            <div key={m.id} className="flex items-center gap-1 text-xs">
                              <span className="flex-1 truncate">{m.port || "?"} · {midiKindInfo(m.kind).label} ch{m.channel} {m.data1}</span>
                              <button disabled={!connected} onClick={() => testMidi(m)} className="text-go disabled:opacity-30">▶ Test</button>
                            </div>
                          ))}
                          {k.type === "memo" && <textarea value={k.text} onChange={(e) => updK({ text: e.target.value } as Partial<Cue>)} rows={2} className="w-full rounded-lg bg-input p-2 text-base outline-none" />}
                        </div>
                      );
                    })}
                    <div className="grid grid-cols-4 gap-1">
                      {CHILD_TYPES.map((t) => (
                        <button key={t} onClick={() => updCue(c.id, { children: [...c.children, newCue(t)] } as Partial<Cue>)} className="h-11 rounded-lg bg-secondary text-xs font-bold">+ {TYPE_LABEL[t]}</button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">Detaljer som MIDI-porte og lydfiler redigeres fuldt på PC'en.</div>
                  </div>
                )}
                {c.type === "audio" && <div className="rounded-lg bg-secondary p-2 text-sm text-muted-foreground">🎵 {c.fileName || "Ingen fil"} – lydfiler vælges på PC'en.</div>}
                <label className="text-xs font-bold text-muted-foreground">Næste cue</label>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(FOLLOW) as Follow[]).map((f) => (
                    <button key={f} onClick={() => updCue(c.id, { follow: f })} className={`h-11 rounded-lg text-xs font-bold ${c.follow === f ? "bg-standby text-background" : "bg-secondary"}`}>{FOLLOW[f]}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-bold text-muted-foreground">Pre-wait (s)</label>
                    <input type="number" inputMode="decimal" step="0.1" value={c.preWait} onChange={(e) => updCue(c.id, { preWait: Math.max(0, Number(e.target.value) || 0) })} className={inp} /></div>
                  <div><label className="text-xs font-bold text-muted-foreground">Post-wait (s)</label>
                    <input type="number" inputMode="decimal" step="0.1" value={c.postWait} onChange={(e) => updCue(c.id, { postWait: Math.max(0, Number(e.target.value) || 0) })} className={inp} /></div>
                </div>
                <label className="text-xs font-bold text-muted-foreground">Farve</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={cueColor(show, c)} onChange={(e) => updCue(c.id, { color: e.target.value })} className="h-11 w-16 rounded bg-transparent" />
                  {c.color && <button onClick={() => song && updSong(song.id, (cs) => cs.map((x) => { if (x.id !== c.id) return x; const { color: _c, ...rest } = x; return rest as Cue; }))} className="text-sm text-muted-foreground underline">Brug type-farve</button>}
                </div>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <button onClick={() => moveCueBy(c.id, -1)} className="h-11 rounded-lg bg-secondary font-bold">▲ Op</button>
                  <button onClick={() => moveCueBy(c.id, 1)} className="h-11 rounded-lg bg-secondary font-bold">▼ Ned</button>
                  <button onClick={() => { if (confirm(`Slet "${c.name}"?`)) { song && updSong(song.id, (cs) => cs.filter((x) => x.id !== c.id)); setEditId(null); } }} className="h-11 rounded-lg bg-destructive font-bold text-destructive-foreground">Slet</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {song ? (
        <div className="rounded-xl border border-dashed border-border p-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">+ Tilføj cue</div>
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map((t) => (
              <button key={t} onClick={() => addCue(t)} className="flex h-14 flex-col items-center justify-center rounded-lg bg-secondary text-xs font-bold">
                <span className="mb-1 h-1.5 w-6 rounded" style={{ background: show.typeColors[t] || DEFAULT_TYPE_COLORS[t] }} />
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={addSong} className="h-14 rounded-xl bg-go text-lg font-bold text-go-foreground">+ Opret første sang</button>
      )}
    </div>
  );
}
