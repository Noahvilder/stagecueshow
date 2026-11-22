/** Show storage. Web: cloud only. Windows app: cloud when online (with a local copy as backup), local only when offline. */
import { isDesktopBundle, isOffline } from "@/lib/desktop";
import { supabase } from "@/integrations/supabase/client";

const KEY = "stagecue.localShows";
type Row = { id: string; name: string; data: unknown; updated_at: string };
const all = (): Row[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Row[]; } catch { return []; } };
const put = (rows: Row[]) => localStorage.setItem(KEY, JSON.stringify(rows));
const upsertLocal = (r: Row) => { const rows = all(); const i = rows.findIndex((x) => x.id === r.id); if (i >= 0) rows[i] = r; else rows.push(r); put(rows); };
/** Cloud is used when not the offline Windows bundle, or when the bundle is online and signed in. */
async function useCloud(): Promise<boolean> {
  if (!isDesktopBundle()) return true;
  if (isOffline()) return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function listShows(): Promise<{ id: string; name: string; updated_at: string }[]> {
  const local = isDesktopBundle() ? all().map(({ id, name, updated_at }) => ({ id, name, updated_at })) : [];
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
  const local = isDesktopBundle() ? all().find((x) => x.id === id) : undefined;
  if (await useCloud()) {
    const { data } = await supabase.from("shows").select("name,data,updated_at").eq("id", id).maybeSingle();
    if (data && (!local || data.updated_at >= local.updated_at)) {
      if (isDesktopBundle()) upsertLocal({ id, name: data.name, data: data.data, updated_at: data.updated_at });
      return { name: data.name, data: data.data };
    }
  }
  return local ? { name: local.name, data: local.data } : null;
}
export async function saveShow(id: string, name: string, data: unknown): Promise<boolean> {
  const updated_at = new Date().toISOString();
  if (isDesktopBundle()) upsertLocal({ id, name, data, updated_at });
  if (!(await useCloud())) return isDesktopBundle();
  const { data: rows, error } = await supabase.from("shows").update({ name, data: data as never, updated_at }).eq("id", id).select("id");
  if (!error && rows?.length) return true;
  // Show made offline in the Windows app: create it in the cloud with the same id.
  if (!error && isDesktopBundle()) { const r = await supabase.from("shows").insert({ id, name, data: data as never }); return !r.error; }
  return isDesktopBundle();
}
export async function createShow(name: string, data: unknown): Promise<string> {
  if (await useCloud()) {
    const { data: r, error } = await supabase.from("shows").insert({ name, data: data as never }).select("id").single();
    if (!error) { if (isDesktopBundle()) upsertLocal({ id: r.id, name, data, updated_at: new Date().toISOString() }); return r.id; }
    if (!isDesktopBundle()) throw error;
  }
  const id = crypto.randomUUID(); upsertLocal({ id, name, data, updated_at: new Date().toISOString() }); return id;
}
export async function deleteShow(id: string) {
  if (isDesktopBundle()) put(all().filter((r) => r.id !== id));
  if (await useCloud()) await supabase.from("shows").delete().eq("id", id);
}
