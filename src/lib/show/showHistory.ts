/** Shows this device has connected to (monitor or remote), kept in localStorage. */
export const HIST_KEY = "stagecue.viewer.history";
export type Hist = { code: string; name: string; monitor: string; at: number };

export const readHist = (): Hist[] => {
  try { const v = JSON.parse(localStorage.getItem(HIST_KEY) ?? "[]"); return Array.isArray(v) ? (v as Hist[]) : []; } catch { return []; }
};

export const rememberShow = (code: string, name?: string, monitor?: string): Hist[] => {
  const prev = readHist();
  const old = prev.find((h) => h.code === code);
  const entry: Hist = { code, name: name || old?.name || `Show ${code}`, monitor: monitor ?? old?.monitor ?? "", at: Date.now() };
  const list = [entry, ...prev.filter((h) => h.code !== code)].slice(0, 10);
  try { localStorage.setItem(HIST_KEY, JSON.stringify(list)); } catch {}
  return list;
};

export const forgetShow = (code: string): Hist[] => {
  const list = readHist().filter((h) => h.code !== code);
  try { localStorage.setItem(HIST_KEY, JSON.stringify(list)); } catch {}
  return list;
};
