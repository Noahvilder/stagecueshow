import { useRef, type ReactNode } from "react";

export type WinState = { x: number; y: number; w: number; h: number; z: number; open: boolean; min: boolean };

export function FloatingWindow(props: {
  title: string;
  state: WinState;
  onChange: (p: Partial<WinState>) => void;
  onFocus: () => void;
  accent?: boolean;
  locked?: boolean;
  children: ReactNode;
}) {
  const { state: s, onChange, onFocus } = props;
  const start = useRef<{ mx: number; my: number; x: number; y: number; w: number; h: number } | null>(null);
  if (!s.open) return null;

  const begin = (e: React.PointerEvent, mode: "move" | "resize") => {
    if (props.locked || (e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    onFocus();
    start.current = { mx: e.clientX, my: e.clientY, x: s.x, y: s.y, w: s.w, h: s.h };
    const move = (ev: PointerEvent) => {
      const st = start.current!;
      const dx = ev.clientX - st.mx, dy = ev.clientY - st.my;
      if (mode === "move") {
        onChange({
          x: Math.max(-st.w + 120, Math.min(window.innerWidth - 120, st.x + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 40, st.y + dy)),
        });
      } else onChange({ w: Math.max(260, st.w + dx), h: Math.max(140, st.h + dy) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      onPointerDown={onFocus}
      className={`absolute flex flex-col overflow-hidden rounded-lg border-2 bg-card shadow-2xl ${props.accent ? "border-standby" : "border-border"}`}
      style={{ left: s.x, top: s.y, width: s.w, height: s.min ? undefined : s.h, zIndex: s.z }}
    >
      <div
        onPointerDown={(e) => begin(e, "move")}
        onDoubleClick={() => !props.locked && onChange({ min: !s.min })}
        className={`flex ${props.locked ? "" : "cursor-move"} select-none items-center gap-2 border-b border-border bg-muted px-3 py-1.5`}
      >
        <span className={`flex-1 truncate text-xs font-bold uppercase tracking-widest ${props.accent ? "text-standby" : "text-muted-foreground"}`}>{props.title}</span>
        {props.locked ? <span className="text-xs" aria-label="Låst">🔒</span> : <>
        <button onClick={() => onChange({ min: !s.min })} className="px-1.5 text-muted-foreground hover:text-foreground" aria-label="Minimer">{s.min ? "▢" : "–"}</button>
        <button onClick={() => onChange({ open: false })} className="px-1.5 text-muted-foreground hover:text-destructive" aria-label="Luk">✕</button></>}
      </div>
      {!s.min && (
        <>
          <div className="@container min-h-0 flex-1 overflow-auto break-words">{props.children}</div>
          {!props.locked && <div onPointerDown={(e) => begin(e, "resize")} className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize" style={{ background: "linear-gradient(135deg, transparent 50%, var(--muted-foreground) 50%)" }} aria-label="Ændr størrelse" />}
        </>
      )}
    </div>
  );
}
