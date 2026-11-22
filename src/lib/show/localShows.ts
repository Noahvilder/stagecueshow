/** Offline show storage for the standalone Windows app (no account, no internet). */
import { isDesktopBundle } from "@/lib/desktop";
import { supabase } from "@/integrations/supabase/client";

const KEY = "stagecue.localShows";
type Row = { id: string; name: string; data: unknown; updated_at: string };
const all = (): Row[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Row[]; } catch { return []; } };
const put = (rows: Row[]) => localStorage.setItem(KEY, JSON.stringify(rows));

export async function listShows(): Promise<{ id: string; name: string; updated_at: string }[]> {
  if (isDesktopBundle()) return all().sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map(({ id, name, updated_at }) => ({ id, name, updated_at }));
  const { data } = await supabase.from("shows").select("id,name,updated_at").order("updated_at", { ascending: false });
  return data ?? [];
}
export async function loadShow(id: string): Promise<{ name: string; data: unknown } | null> {
  if (isDesktopBundle()) { const r = all().find((x) => x.id === id); return r ? { name: r.name, data: r.data } : null; }
  const { data } = await supabase.from("shows").select("name,data").eq("id", id).single();
  return data ?? null;
}
export async function saveShow(id: string, name: string, data: unknown): Promise<boolean> {
  const updated_at = new Date().toISOString();
  if (isDesktopBundle()) { put(all().map((r) => (r.id === id ? { ...r, name, data, updated_at } : r))); return true; }
  const { error } = await supabase.from("shows").update({ name, data: data as never, updated_at }).eq("id", id);
  return !error;
}
export async function createShow(name: string, data: unknown): Promise<string> {
  if (isDesktopBundle()) { const id = crypto.randomUUID(); put([...all(), { id, name, data, updated_at: new Date().toISOString() }]); return id; }
  const { data: r, error } = await supabase.from("shows").insert({ name, data: data as never }).select("id").single();
  if (error) throw error;
  return r.id;
}
export async function deleteShow(id: string) {
  if (isDesktopBundle()) { put(all().filter((r) => r.id !== id)); return; }
  await supabase.from("shows").delete().eq("id", id);
}
