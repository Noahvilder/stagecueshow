import type { CartPad } from "./types";

export const PAD_COLORS = ["#e5484d", "#f76b15", "#ffc53d", "#46a758", "#0090ff", "#8e4ec6", "#d6409f", "#8b8d98"];

/** Pad bound to a pressed key (case-insensitive, single character keys). */
export function padForKey(pads: CartPad[], key: string): CartPad | undefined {
  const k = key.toLowerCase();
  return k.length === 1 ? pads.find((p) => p.key?.toLowerCase() === k) : undefined;
}

/** Keys already taken by another pad. */
export function keyTaken(pads: CartPad[], key: string, exceptId: string): boolean {
  const k = key.toLowerCase();
  return !!k && pads.some((p) => p.id !== exceptId && p.key?.toLowerCase() === k);
}
