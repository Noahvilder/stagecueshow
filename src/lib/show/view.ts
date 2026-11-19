/** Optional cue-list columns and helpers; everything is user-toggleable. */
export const COLS = { handle: "Træk-håndtag", number: "Cue-nummer", details: "Detaljer", stikord: "Stikord", type: "Type", follow: "Stop/Auto-next", tips: "Hjælpetekster" } as const;
export type ColKey = keyof typeof COLS;
export type ViewPrefs = Record<ColKey, boolean>;
export const DEFAULT_VIEW: ViewPrefs = { handle: true, number: true, details: true, stikord: true, type: true, follow: true, tips: true };
const KEY = "stagecue.view";
export const loadView = (): ViewPrefs => { try { return { ...DEFAULT_VIEW, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEFAULT_VIEW; } };
export const saveView = (v: ViewPrefs) => localStorage.setItem(KEY, JSON.stringify(v));
/** Grid template for the visible columns (status + name always shown). */
export function gridCols(v: ViewPrefs): string {
  return [v.handle && "16px", "28px", v.number && "44px", "1fr", v.type && "auto", v.follow && "auto"].filter(Boolean).join("_");
}
/** Hide/show native hover tips app-wide by swapping title <-> data-tip. */
export function applyTips(on: boolean) {
  const swap = () => {
    if (on) document.querySelectorAll<HTMLElement>("[data-tip]").forEach((el) => { el.title = el.dataset["tip"]!; delete el.dataset["tip"]; });
    else document.querySelectorAll<HTMLElement>("[title]").forEach((el) => { el.dataset["tip"] = el.title; el.removeAttribute("title"); });
  };
  swap();
  if (on) return () => {};
  const mo = new MutationObserver(swap);
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["title"] });
  return () => mo.disconnect();
}
