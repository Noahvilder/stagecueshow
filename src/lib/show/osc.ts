/** OSC 1.0 encoding + sending. In the Windows app packets go out over UDP; browsers can't send UDP. */
import type { OscCue } from "./types";

const pad4 = (n: number) => (4 - (n % 4)) % 4;
function oscString(s: string): number[] {
  const b = Array.from(new TextEncoder().encode(s));
  b.push(0);
  for (let i = pad4(b.length); i > 0; i--) b.push(0);
  return b;
}

/** Parse "1 0.5 hello" → typed args: integers → i, decimals → f, rest → s ("quoted text" allowed). */
export function parseOscArgs(raw: string): (number | string)[] {
  const out: (number | string)[] = [];
  for (const m of raw.matchAll(/"([^"]*)"|(\S+)/g)) {
    if (m[1] !== undefined) out.push(m[1]);
    else { const t = m[2]!; out.push(/^-?\d+(\.\d+)?$/.test(t) ? (t.includes(".") ? Number(t) : parseInt(t, 10)) : t); }
  }
  return out;
}

export function encodeOsc(address: string, args: (number | string)[]): Uint8Array {
  let tags = ",";
  const data: number[] = [];
  for (const a of args) {
    if (typeof a === "string") { tags += "s"; data.push(...oscString(a)); continue; }
    const buf = new DataView(new ArrayBuffer(4));
    if (Number.isInteger(a)) { tags += "i"; buf.setInt32(0, a); } else { tags += "f"; buf.setFloat32(0, a); }
    data.push(...new Uint8Array(buf.buffer));
  }
  return new Uint8Array([...oscString(address), ...oscString(tags), ...data]);
}

export const OSC_TEMPLATES: { label: string; port: number; address: string; args: string }[] = [
  { label: "QLC+ (knap 1 tænd)", port: 7700, address: "/0/button/1", args: "255" },
  { label: "Resolume (spil klip 1/1)", port: 7000, address: "/composition/layers/1/clips/1/connect", args: "1" },
  { label: "GrandMA (Go+ exec 1)", port: 8000, address: "/gma3/cmd", args: '"Go+ Exec 1"' },
  { label: "Reaper (play)", port: 8000, address: "/play", args: "1" },
];

type TauriWin = { __TAURI_INTERNALS__?: { invoke: (cmd: string, args: unknown) => Promise<unknown> } };

/** Returns null on success, or an error message. */
export async function sendOsc(c: Pick<OscCue, "host" | "port" | "address" | "args">): Promise<string | null> {
  const t = (globalThis as unknown as TauriWin).__TAURI_INTERNALS__;
  if (!t) return "OSC kan kun sendes fra Windows-appen (browsere kan ikke sende UDP)";
  if (!c.address.startsWith("/")) return "OSC-adressen skal starte med /";
  try {
    await t.invoke("send_osc", { host: c.host || "127.0.0.1", port: c.port, data: Array.from(encodeOsc(c.address, parseOscArgs(c.args))) });
    return null;
  } catch (e) { return `OSC fejlede: ${String(e)}`; }
}

/** Known virtual (software) MIDI ports used to talk to other programs on the same PC. */
export const isVirtualMidi = (name: string) => /loopmidi|loopbe|rtpmidi|virtual|bome|iac|stagecue/i.test(name);
