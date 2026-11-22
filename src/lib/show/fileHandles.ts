/** Remembers which file on disk each show belongs to, so Ctrl+S overwrites it after a restart. */
const DB = "stagecue-files";
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("h");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function rememberHandle(showId: string, v: { file: unknown; dir: unknown } | null) {
  try {
    const db = await open();
    const tx = db.transaction("h", "readwrite");
    if (v) tx.objectStore("h").put(v, showId); else tx.objectStore("h").delete(showId);
  } catch { /* ingen IndexedDB */ }
}
export async function recallHandle(showId: string): Promise<{ file: any; dir: any } | null> {
  try {
    const db = await open();
    return await new Promise((res) => { const r = db.transaction("h").objectStore("h").get(showId); r.onsuccess = () => res((r.result as never) ?? null); r.onerror = () => res(null); });
  } catch { return null; }
}
/** Ask for write access again if the browser dropped it (only prompts once per session). */
export async function canWrite(h: any): Promise<boolean> {
  if (!h?.queryPermission) return true;
  if ((await h.queryPermission({ mode: "readwrite" })) === "granted") return true;
  try { return (await h.requestPermission({ mode: "readwrite" })) === "granted"; } catch { return false; }
}
