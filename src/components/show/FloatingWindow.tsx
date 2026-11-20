import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTrApp } from "@/lib/show/appI18n";

export type WinState = { x: number; y: number; w: number; h: number; z: number; open: boolean; min: boolean; popped?: boolean };

export function FloatingWindow(props: {
  title: string;
  state: WinState;
  onChange: (p: Partial<WinState>) => void;
  onFocus: () => void;
  accent?: boolean;
  locked?: boolean;
  children: ReactNode;
}) {
  const tr = useTrApp();
  const { state: s, onChange, onFocus } = props;
  const start = useRef<{ mx: number; my: number; x: number; y: number; w: number; h: number } | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const popped = !!(s.open && s.popped);
  useEffect(() => {
    if (!popped) return;
    const pw = window.open("", `stagecue-${props.title}`, `popup=yes,width=${Math.round(s.w)},height=${Math.round(s.h)}`);
    if (!pw) { changeRef.current({ popped: false }); return; }
    const d = pw.document;
    d.title = `StageCue · ${tr(props.title)}`;
    d.head.innerHTML = "";
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => d.head.appendChild(n.cloneNode(true)));
    d.documentElement.className = document.documentElement.className;
    for (const a of Array.from(document.documentElement.attributes)) if (a.name.startsWith("data-")) d.documentElement.setAttribute(a.name, a.value);
    d.body.className = "bg-background text-foreground m-0 h-screen overflow-hidden";
    d.body.innerHTML = "";
    const root = d.createElement("div");
    root.className = "@container h-full overflow-auto break-words";
    d.body.appendChild(root);
    // Forward keyboard shortcuts (GO, stop, …) to the main pult.
    const fwd = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      const ev = new KeyboardEvent(e.type, { key: e.key, code: e.code, ctrlKey: e.ctrlKey, altKey: e.altKey, shiftKey: e.shiftKey, metaKey: e.metaKey, repeat: e.repeat, bubbles: true, cancelable: true });
      window.dispatchEvent(ev);
      if (ev.defaultPrevented) e.preventDefault();
    };
    pw.addEventListener("keydown", fwd);
    pw.addEventListener("keyup", fwd);
    let closing = false;
    const gone = () => { if (!closing) changeRef.current({ popped: false }); };
    pw.addEventListener("pagehide", gone);
    const iv = window.setInterval(() => { if (pw.closed) { window.clearInterval(iv); gone(); } }, 500);
    const mainGone = () => pw.close();
    window.addEventListener("beforeunload", mainGone);
    setHost(root);
    return () => {
      closing = true;
      window.clearInterval(iv);
      window.removeEventListener("beforeunload", mainGone);
      setHost(null);
      if (!pw.closed) pw.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popped]);
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
        <span className={`flex-1 truncate text-xs font-bold uppercase tracking-widest ${props.accent ? "text-standby" : "text-muted-foreground"}`}>{tr(props.title)}</span>
        {props.locked ? <span className="text-xs" aria-label="Låst">🔒</span> : <>
        <button onClick={() => onChange({ popped: !s.popped, min: false })} className="px-1.5 text-muted-foreground hover:text-foreground" title={tr(s.popped ? "Gendan i pulten" : "Åbn på anden skærm")} aria-label={tr(s.popped ? "Gendan i pulten" : "Åbn på anden skærm")}>{s.popped ? "⤶" : "⧉"}</button>
        <button onClick={() => onChange({ min: !s.min })} className="px-1.5 text-muted-foreground hover:text-foreground" aria-label="Minimer">{s.min ? "▢" : "–"}</button>
        <button onClick={() => onChange({ open: false })} className="px-1.5 text-muted-foreground hover:text-destructive" aria-label="Luk">✕</button></>}
      </div>
      {!s.min && (
        <>
          {popped ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-3 text-center text-xs text-muted-foreground">
              <span>⧉ {tr("Åbnet i separat vindue")}</span>
              <button onClick={() => onChange({ popped: false })} className="rounded border border-border px-2 py-1 text-foreground hover:bg-muted">⤶ {tr("Gendan i pulten")}</button>
              {host && createPortal(props.children, host)}
            </div>
          ) : (
            <div className="@container min-h-0 flex-1 overflow-auto break-words">{props.children}</div>
          )}
          {!props.locked && <div onPointerDown={(e) => begin(e, "resize")} className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize" style={{ background: "linear-gradient(135deg, transparent 50%, var(--muted-foreground) 50%)" }} aria-label="Ændr størrelse" />}
        </>
      )}
    </div>
  );
}
