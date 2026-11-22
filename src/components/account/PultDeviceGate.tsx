import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId, guessDeviceName, MAX_PULT_DEVICES } from "@/lib/show/device";
import { DeviceList } from "./DeviceList";
import { isDesktopBundle } from "@/lib/desktop";

export function PultDeviceGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "ok" | "limit" | "error">("checking");
  const check = async () => {
    if (isDesktopBundle()) return setState("ok");
    setState("checking");
    const { data, error } = await supabase.rpc("claim_pult_device", { _device_id: getDeviceId(), _device_name: guessDeviceName() });
    if (error) return setState("error");
    const r = data as { ok: boolean; reason?: string };
    setState(r.ok ? "ok" : r.reason === "limit" ? "limit" : "error");
  };
  useEffect(() => { check(); }, []);
  if (state === "ok") return <>{children}</>;
  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        {state === "checking" && <p className="text-muted-foreground">Tjekker enhed…</p>}
        {state === "error" && <><p>Kunne ikke tjekke enheden.</p><button onClick={check} className="rounded bg-go px-4 py-2 font-bold text-go-foreground">Prøv igen</button></>}
        {state === "limit" && <>
          <h1 className="text-2xl font-black">Maks {MAX_PULT_DEVICES} pult-enheder</h1>
          <p className="text-muted-foreground">Du har nået grænsen. Fjern en enhed for at fortsætte på denne. Scenemonitors tæller ikke med.</p>
          <DeviceList onChange={check} />
          <Link to="/hub" className="text-sm text-muted-foreground underline">Tilbage</Link>
        </>}
      </div>
    </div>
  );
}
