/** Show storage. Always saved locally on this computer; cloud backup only when Pro cloud sync is switched on. Existing cloud shows can still be read when signed in. */
import { isOffline } from "@/lib/desktop";
import { supabase } from "@/integrations/supabase/client";

const KEY = "stagecue.localShows";
type Row = { id: string; name: string; data: unknown; updated_at: string };
const all = (): Row[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Row[]; } catch { return []; } };
const put = (rows: Row[]) => localStorage.setItem(KEY, JSON.stringify(rows));
const upsertLocal = (r: Row) => { const rows = all(); const i = rows.findIndex((x) => x.id === r.id); if (i >= 0) rows[i] = r; else rows.push(r); put(rows); };
const SYNC = "stagecue.cloudSync";
export const cloudSyncOn = () => { try { return localStorage.getItem(SYNC) === "1"; } catch { return false; } };
export const setCloudSync = (on: boolean) => { if (on) localStorage.setItem(SYNC, "1"); else localStorage.removeItem(SYNC); };
/** Cloud can be read when online and signed in. */
async function useCloud(): Promise<boolean> {
  if (isOffline()) return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function listShows(): Promise<{ id: string; name: string; updated_at: string }[]> {
  const local = all().map(({ id, name, updated_at }) => ({ id, name, updated_at }));
  if (await useCloud()) {
    const { data, error } = await supabase.from("shows").select("id,name,updated_at").order("updated_at", { ascending: false });
    if (!error && data) {
      const ids = new Set(data.map((d) => d.id));
      return [...data, ...local.filter((l) => !ids.has(l.id))].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    }
  }
  return local.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
export async function loadShow(id: string): Promise<{ name: string; data: unknown } | null> {
  const local = all().find((x) => x.id === id);
  if (await useCloud()) {
    const { data } = await supabase.from("shows").select("name,data,updated_at").eq("id", id).maybeSingle();
    if (data && (!local || data.updated_at >= local.updated_at)) {
      upsertLocal({ id, name: data.name, data: data.data, updated_at: data.updated_at });
      return { name: data.name, data: data.data };
    }
  }
  return local ? { name: local.name, data: local.data } : null;
}
export async function saveShow(id: string, name: string, data: unknown): Promise<boolean> {
  const updated_at = new Date().toISOString();
  upsertLocal({ id, name, data, updated_at });
  if (!cloudSyncOn() || !(await useCloud())) return true;
  const { data: rows, error } = await supabase.from("shows").update({ name, data: data as never, updated_at }).eq("id", id).select("id");
  if (!error && rows?.length) return true;
  // Show made offline in the Windows app: create it in the cloud with the same id.
  if (!error) await supabase.from("shows").insert({ id, name, data: data as never });
  return true;
}
export async function createShow(name: string, data: unknown): Promise<string> {
  const id = crypto.randomUUID(); upsertLocal({ id, name, data, updated_at: new Date().toISOString() });
  if (cloudSyncOn() && (await useCloud())) await supabase.from("shows").insert({ id, name, data: data as never });
  return id;
}
export async function deleteShow(id: string) {
  put(all().filter((r) => r.id !== id));
  if (await useCloud()) await supabase.from("shows").delete().eq("id", id);
}
