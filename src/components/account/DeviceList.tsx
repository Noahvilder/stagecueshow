import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/show/device";

type Dev = { id: string; device_id: string; device_name: string; last_seen_at: string };

export function DeviceList({ onChange }: { onChange?: () => void }) {
  const [devs, setDevs] = useState<Dev[] | null>(null);
  const me = typeof window !== "undefined" ? getDeviceId() : "";
  const load = async () => {
    const { data } = await supabase.from("pult_devices").select("id,device_id,device_name,last_seen_at").order("last_seen_at", { ascending: false });
    setDevs(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const remove = async (d: Dev) => {
    if (!confirm(`Log "${d.device_name}" ud af pult-mode?`)) return;
    await supabase.from("pult_devices").delete().eq("id", d.id);
    await load(); onChange?.();
  };
  const rename = async (d: Dev) => {
    const n = prompt("Navn på enheden", d.device_name)?.trim();
    if (!n) return;
    await supabase.from("pult_devices").update({ device_name: n.slice(0, 60) }).eq("id", d.id);
    load();
  };
  if (!devs) return <p className="text-sm text-muted-foreground">Henter enheder…</p>;
  if (!devs.length) return <p className="text-sm text-muted-foreground">Ingen pult-enheder endnu.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {devs.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
          <div className="min-w-0">
            <div className="truncate font-bold">{d.device_name}{d.device_id === me && <span className="ml-2 rounded bg-go/20 px-1.5 text-xs text-go">denne enhed</span>}</div>
            <div className="text-xs text-muted-foreground">Sidst aktiv {new Date(d.last_seen_at).toLocaleString("da-DK")}</div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => rename(d)} className="rounded bg-secondary px-2 py-1 text-xs font-semibold">Omdøb</button>
            <button onClick={() => remove(d)} className="rounded bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground">Fjern</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
