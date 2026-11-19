/** Live-safety helpers: double-GO guard, double-tap panic, crash recovery of the playhead. */
export const DEFAULT_GO_GUARD_MS = 500;
export const DOUBLE_TAP_MS = 600;
export const RECOVERY_MAX_AGE_MS = 12 * 3600 * 1000;

/** True when a GO at `now` should fire, given the previous accepted GO time. */
export function acceptGo(lastGo: number | null, now: number, guardMs: number): boolean {
  return lastGo === null || guardMs <= 0 || now - lastGo >= guardMs;
}

/** True when a second press at `now` counts as a double tap after `prev`. */
export function isDoubleTap(prev: number | null, now: number, windowMs = DOUBLE_TAP_MS): boolean {
  return prev !== null && now - prev <= windowMs;
}

export interface Playhead { standbyId: string | null; label: string; t: number; clean: boolean }
const key = (showId: string) => `stagecue.playhead.${showId}`;

export function savePlayhead(showId: string, p: Playhead) {
  try { localStorage.setItem(key(showId), JSON.stringify(p)); } catch {}
}
export function readPlayhead(showId: string): Playhead | null {
  try { const r = localStorage.getItem(key(showId)); return r ? JSON.parse(r) as Playhead : null; } catch { return null; }
}
/** A saved playhead is worth offering when the last session did not close cleanly and is recent. */
export function shouldOfferResume(p: Playhead | null, now: number): p is Playhead {
  return !!p && !p.clean && !!p.standbyId && now - p.t < RECOVERY_MAX_AGE_MS;
}
