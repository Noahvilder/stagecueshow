/** Tab lines (bass 4–8 strings / guitar) and transposition helpers. */
const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export const isTabLine = (l: string) => /^\s*[A-Ga-g][#b]?\s*\|[-0-9hpbrx\/\\~|.\s()^]*$/.test(l) && /[-]{2,}/.test(l);

function note(n: string, semis: number, flat: boolean) {
  const up = n[0]!.toUpperCase() + n.slice(1);
  let i = SHARP.indexOf(up); if (i < 0) i = FLAT.indexOf(up);
  if (i < 0) return n;
  const j = (((i + semis) % 12) + 12) % 12;
  const out = (flat ? FLAT : SHARP)[j]!;
  return n[0] === n[0]!.toLowerCase() ? out.toLowerCase() : out;
}

export function transposeChord(ch: string, semis: number): string {
  if (!semis) return ch;
  return ch.replace(/(^|\/)([A-G][#b]?)/g, (_, pre: string, root: string) => pre + note(root, semis, root.includes("b")));
}

/** Shift every fret number; keeps column alignment by eating/adding dashes. Negative frets go up an octave. */
export function transposeTabLine(line: string, semis: number): string {
  if (!semis) return line;
  const bar = line.indexOf("|");
  const head = line.slice(0, bar), body = line.slice(bar);
  let out = "";
  for (let i = 0; i < body.length; ) {
    const m = /^\d+/.exec(body.slice(i));
    if (!m) { out += body[i]; i++; continue; }
    let f = Number(m[0]) + semis;
    while (f < 0) f += 12;
    const s = String(f);
    i += m[0].length;
    out += s;
    let diff = s.length - m[0].length;
    while (diff > 0 && body[i] === "-") { i++; diff--; }
    while (diff < 0) { out += "-"; diff++; }
  }
  return head + out;
}

export function transposeSource(src: string, semis: number): string {
  if (!semis) return src;
  return src.split("\n").map((l) => isTabLine(l) ? transposeTabLine(l, semis) : l.replace(/\[([^\]]+)\]/g, (_, c: string) => `[${transposeChord(c, semis)}]`)).join("\n");
}

export const TAB_TUNINGS: Record<string, string[]> = {
  "Bas 4": ["G", "D", "A", "E"],
  "Bas 5": ["G", "D", "A", "E", "B"],
  "Bas 6": ["C", "G", "D", "A", "E", "B"],
  "Guitar 6": ["e", "B", "G", "D", "A", "E"],
  "Guitar 7": ["e", "B", "G", "D", "A", "E", "B"],
  "Guitar 8": ["e", "B", "G", "D", "A", "E", "B", "F#"],
};
export const tabTemplate = (strings: string[]) => strings.map((s) => `${s.padEnd(2)}|${"-".repeat(32)}|`).join("\n");
