import type { CueType } from "./types";
export type ShortcutAction = "go" | "panic" | "hardStop" | "next" | "prev" | "lock" | "help" | "mute" | `add:${CueType}`;
export type ShortcutMap = Partial<Record<ShortcutAction, string>>;
export const SHORTCUT_LABEL: Record<ShortcutAction, string> = {
  go: "GO", panic: "Panic (fade ud)", hardStop: "Hårdt stop", next: "Standby ned", prev: "Standby op",
  lock: "Lås / lås op show", help: "Åbn genveje", mute: "Mute PA",
  "add:audio": "Nyt lyd-cue", "add:midi": "Nyt MIDI-cue", "add:fade": "Nyt fade-cue", "add:stop": "Nyt stop-cue",
  "add:pause": "Nyt pause-cue", "add:wait": "Nyt vente-cue", "add:memo": "Nyt memo-cue", "add:group": "Nyt gruppe-cue",
};
export const DEFAULT_SHORTCUTS: ShortcutMap = {
  go: "Space", panic: "Escape", next: "ArrowDown", prev: "ArrowUp", lock: "Ctrl+KeyL", help: "Ctrl+KeyK",
  "add:audio": "KeyA", "add:midi": "KeyM", "add:fade": "KeyF", "add:memo": "KeyN",
};
const KEY = "stagecue.shortcuts.v1";
export function comboOf(e: { code: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): string {
  return [(e.ctrlKey || e.metaKey) && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", e.code].filter(Boolean).join("+");
}
export function prettyCombo(c?: string): string {
  if (!c) return "—";
  return c.replace(/Key([A-Z])/, "$1").replace(/Digit(\d)/, "$1").replace("Space", "Mellemrum").replace("Escape", "Esc").replace("ArrowDown", "↓").replace("ArrowUp", "↑");
}
export function findAction(map: ShortcutMap, combo: string): ShortcutAction | null {
  for (const [a, c] of Object.entries(map)) if (c === combo) return a as ShortcutAction;
  return null;
}
/** Assign combo to action, removing it from any other action. */
export function assign(map: ShortcutMap, action: ShortcutAction, combo: string | null): ShortcutMap {
  const out: ShortcutMap = {};
  for (const [a, c] of Object.entries(map)) if (c !== combo && a !== action) out[a as ShortcutAction] = c;
  if (combo) out[action] = combo;
  return out;
}
export function loadShortcuts(): ShortcutMap {
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : { ...DEFAULT_SHORTCUTS }; } catch { return { ...DEFAULT_SHORTCUTS }; }
}
export function saveShortcuts(m: ShortcutMap) { localStorage.setItem(KEY, JSON.stringify(m)); }
