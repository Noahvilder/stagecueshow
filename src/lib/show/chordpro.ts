export type ChordSeg = { chord: string; text: string };
export type ChordLine = { segs: ChordSeg[]; chordsOnly: boolean; hasChords: boolean };

/** Parse "[Eb]Lights go [Bbm]out" into chord-over-lyric segments, one entry per line. */
export function parseChordPro(src: string): ChordLine[] {
  return src.replace(/\r/g, "").split("\n").map((line) => {
    const segs: ChordSeg[] = [];
    const re = /\[([^\]]*)\]/g;
    let last = 0; let chord = ""; let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (m.index > last || chord) segs.push({ chord, text: line.slice(last, m.index) });
      chord = m[1]!.trim(); last = m.index + m[0].length;
    }
    segs.push({ chord, text: line.slice(last) });
    const clean = segs.filter((s, i) => i > 0 || s.chord || s.text);
    const hasChords = clean.some((s) => s.chord);
    const chordsOnly = hasChords && clean.every((s) => !s.text.trim());
    return { segs: clean, chordsOnly, hasChords };
  });
}
