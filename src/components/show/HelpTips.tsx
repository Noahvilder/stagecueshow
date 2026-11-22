import { useEffect, useState } from "react";
import { trApp, useAppLang } from "@/lib/show/appI18n";

/** Fast, styled tooltips for every element with a `title` (native ones are slow/hidden in the desktop app). */
export function HelpTips() {
  const lang = useAppLang();
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  useEffect(() => {
    let timer = 0;
    let cur: HTMLElement | null = null;
    const restore = () => { if (cur?.dataset["tip"] != null) { cur.setAttribute("title", cur.dataset["tip"]); delete cur.dataset["tip"]; } cur = null; };
    const over = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.("[title]") as HTMLElement | null;
      if (!el || el === cur) return;
      restore(); window.clearTimeout(timer); setTip(null);
      const text = el.getAttribute("title");
      if (!text) return;
      cur = el; el.dataset["tip"] = text; el.removeAttribute("title");
      timer = window.setTimeout(() => {
        const r = el.getBoundingClientRect();
        setTip({ text: trApp(text, lang), x: Math.min(window.innerWidth - 300, Math.max(8, r.left + r.width / 2 - 140)), y: r.bottom + 6 > window.innerHeight - 60 ? r.top - 44 : r.bottom + 6 });
      }, 250);
    };
    const out = (e: MouseEvent) => {
      if (cur && !cur.contains(e.relatedTarget as Node)) { window.clearTimeout(timer); restore(); setTip(null); }
    };
    const hide = () => { window.clearTimeout(timer); restore(); setTip(null); };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    document.addEventListener("mousedown", hide, true);
    return () => { hide(); document.removeEventListener("mouseover", over); document.removeEventListener("mouseout", out); document.removeEventListener("mousedown", hide, true); };
  }, [lang]);
  if (!tip) return null;
  return <div role="tooltip" className="pointer-events-none fixed z-[200000] max-w-[280px] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-xl" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>;
}
