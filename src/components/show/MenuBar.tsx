import { useEffect, useRef, useState } from "react";

export type MenuItem = { label: string; keys?: string; onClick?: () => void; checked?: boolean; disabled?: boolean } | "sep";
export type Menu = { label: string; items: MenuItem[] };

/** Classic thin desktop menu bar (File, Edit, ...). Click to open, hover to switch. */
export function MenuBar({ menus }: { menus: Menu[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open === null) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(null); } };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc, true);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", esc, true); };
  }, [open]);
  return (
    <div ref={ref} role="menubar" className="flex h-7 items-stretch border-b border-border bg-card px-1 text-[13px] select-none">
      {menus.map((m, i) => (
        <div key={m.label} className="relative">
          <button
            role="menuitem"
            onClick={() => setOpen(open === i ? null : i)}
            onMouseEnter={() => open !== null && setOpen(i)}
            className={`h-full px-3 ${open === i ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
          >{m.label}</button>
          {open === i && (
            <div role="menu" className="absolute left-0 top-full z-[100] min-w-60 rounded-b-md border border-border bg-card py-1 shadow-2xl">
              {m.items.map((it, j) => it === "sep" ? <div key={j} className="my-1 h-px bg-border" /> : (
                <button
                  key={j}
                  role="menuitem"
                  disabled={it.disabled}
                  onClick={() => { setOpen(null); it.onClick?.(); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span className="w-4 text-center text-go">{it.checked ? "✓" : ""}</span>
                  <span className="flex-1">{it.label}</span>
                  {it.keys && <span className="font-mono text-xs text-muted-foreground">{it.keys}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
