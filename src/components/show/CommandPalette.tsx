import { useEffect, useMemo, useRef, useState } from "react";
import type { Menu } from "./MenuBar";

type Hit = { menu: string; label: string; keys?: string | undefined; run: () => void };

/** Search every menu action, setting and window by name (Ctrl+F). */
export function CommandPalette({ menus }: { menus: Menu[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); e.stopPropagation(); setOpen(true); }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, []);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inp.current?.focus(), 0); } }, [open]);
  const all = useMemo<Hit[]>(() => menus.flatMap((m) => m.items.flatMap((it) => it === "sep" || it.disabled || !it.onClick ? [] : [{ menu: m.label, label: it.label, keys: it.keys, run: it.onClick }])), [menus]);
  const hits = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter((h) => words.every((w) => `${h.menu} ${h.label}`.toLowerCase().includes(w))).slice(0, 12);
  }, [all, q]);
  const go = (h?: Hit) => { if (!h) return; setOpen(false); h.run(); };
  return (
    <>
      <button onClick={() => setOpen(true)} title="Søg efter funktioner og indstillinger (Ctrl+F)" className="ml-auto self-center rounded px-3 text-[13px] text-muted-foreground hover:bg-secondary hover:text-foreground">🔍 Søg <span className="font-mono text-xs">Ctrl+F</span></button>
      {open && (
        <div className="fixed inset-0 z-[100001] flex items-start justify-center bg-background/70 pt-24" onMouseDown={() => setOpen(false)}>
          <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <input
              ref={inp}
              value={q}
              onChange={(e) => { setQ(e.target.value); setSel(0); }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") setOpen(false);
                else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
                else if (e.key === "Enter") go(hits[sel]);
              }}
              placeholder="Søg: fx click, genveje, lås, MIDI, indstillinger…"
              className="w-full border-b border-border bg-transparent px-4 py-3 text-lg outline-none"
              aria-label="Søg i funktioner"
            />
            <ul className="max-h-96 overflow-y-auto py-1">
              {hits.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Ingen funktioner fundet</li>}
              {hits.map((h, i) => (
                <li key={h.menu + h.label}>
                  <button onMouseEnter={() => setSel(i)} onClick={() => go(h)} className={`flex w-full items-center gap-3 px-4 py-2 text-left ${i === sel ? "bg-accent" : ""}`}>
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">{h.menu}</span>
                    <span className="flex-1">{h.label}</span>
                    {h.keys && <span className="font-mono text-xs text-muted-foreground">{h.keys}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
