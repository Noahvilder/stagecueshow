import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TYPE_COLORS, TYPE_LABEL, cueColor, emptyShow, newCue, parseShow, uid } from "@/lib/show/logic";
import type { Cue, CueType, Follow, Show } from "@/lib/show/types";

const TYPES: CueType[] = ["audio", "midi", "fade", "stop", "pause", "wait", "memo"];
const FOLLOW: Record<Follow, string> = { manual: "Manuel GO", withStart: "Auto ved start", afterEnd: "Auto ved slut" };

/** Phone-friendly show editor. Saves to the cloud and, when connected, pushes live to the PC. */
export function MobileBuilder({ showId, connected, push }: { showId: string; connected: boolean; push: (s: Show) => void }) {
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
                <label className="text-xs font-bold text-muted-foreground">Noter (vises på scenen)</label>
                <textarea value={c.notes ?? ""} onChange={(e) => updCue(c.id, { notes: e.target.value })} rows={4} className="w-full rounded-lg bg-input p-3 text-base outline-none" />
                {c.type === "memo" && (<>
                  <label className="text-xs font-bold text-muted-foreground">Memo-tekst</label>
                  <textarea value={c.text} onChange={(e) => updCue(c.id, { text: e.target.value } as Partial<Cue>)} rows={3} className="w-full rounded-lg bg-input p-3 text-base outline-none" />
                </>)}
                {(c.type === "wait" || c.type === "fade" || c.type === "stop") && (<>
                  <label className="text-xs font-bold text-muted-foreground">Varighed (s)</label>
                  <input type="number" inputMode="decimal" step="0.1" value={c.duration} onChange={(e) => updCue(c.id, { duration: Math.max(0, Number(e.target.value) || 0) } as Partial<Cue>)} className={inp} />
                </>)}
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
