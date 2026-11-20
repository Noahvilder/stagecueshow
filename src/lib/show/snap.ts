export type SnapMode = "free" | "grid" | "magnet" | "both";
export const GRID = 24;
export const MAGNET = 15;
type R = { x: number; y: number; w: number; h: number };

/** Snap a moved/resized window: grid steps and/or magnetic edges against other windows and the screen. */
export function snapRect(r: R, others: R[], mode: SnapMode, screen: { w: number; h: number }, resizing = false): R {
  if (mode === "free") return r;
  let { x, y, w, h } = r;
  const g = (v: number) => Math.round(v / GRID) * GRID;
  if (mode === "grid" || mode === "both") {
    if (resizing) { w = g(w); h = g(h); } else { x = g(x); y = g(y); }
  }
  if (mode === "magnet" || mode === "both") {
    const xs = [0, screen.w, ...others.flatMap((o) => [o.x, o.x + o.w])];
    const ys = [0, screen.h, ...others.flatMap((o) => [o.y, o.y + o.h])];
    const near = (v: number, list: number[]) => list.find((t) => Math.abs(t - v) < MAGNET);
    if (resizing) {
      const rx = near(x + w, xs); if (rx !== undefined) w = rx - x;
      const by = near(y + h, ys); if (by !== undefined) h = by - y;
    } else {
      const lx = near(x, xs), rx = near(x + w, xs);
      if (lx !== undefined) x = lx; else if (rx !== undefined) x = rx - w;
      const ty = near(y, ys), by = near(y + h, ys);
      if (ty !== undefined) y = ty; else if (by !== undefined) y = by - h;
    }
  }
  return { x, y, w, h };
}
