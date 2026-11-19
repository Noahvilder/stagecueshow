import { useEffect, useRef, useState } from "react";
import type { Peer as PeerT } from "peerjs";
import { supabase } from "@/integrations/supabase/client";
import { PEER_PREFIX, isValidCode, type HostMsg } from "@/lib/show/remote";

/** Backup PC: mirrors the master console's standby cue over the network (Pro). */
export function HotStandby({ showId, onStandby, onStop }: { showId: string; onStandby: (id: string | null) => void; onStop: () => void }) {
  const [status, setStatus] = useState<"connecting" | "synced" | "lost">("connecting");
  const cb = useRef(onStandby); cb.current = onStandby;
  useEffect(() => {
    let peer: PeerT | null = null; let dead = false; let retry: ReturnType<typeof setTimeout>; let last = 0;
    const watch = setInterval(() => { if (last && Date.now() - last > 4000) setStatus("lost"); }, 1000);
    (async () => {
      const { data } = await supabase.from("shows").select("remote_code").eq("id", showId).single();
      const code = data?.remote_code;
      if (dead || !code || !isValidCode(code)) { setStatus("lost"); return; }
      const { Peer } = await import("peerjs");
      if (dead) return;
      peer = new Peer();
      const connect = () => {
        if (dead || !peer) return;
        const c = peer.connect(PEER_PREFIX + code, { reliable: true, metadata: { role: "viewer" } });
        c.on("data", (d) => { const m = d as HostMsg; if (m.t === "state") { last = Date.now(); setStatus("synced"); cb.current(m.s.standbyId); } });
        c.on("close", () => { setStatus("lost"); retry = setTimeout(connect, 1500); });
      };
      peer.on("open", connect);
      peer.on("error", () => { setStatus("lost"); clearTimeout(retry); retry = setTimeout(connect, 2000); });
    })();
    return () => { dead = true; clearTimeout(retry); clearInterval(watch); peer?.destroy(); };
  }, [showId]);
  const cls = status === "synced" ? "bg-go text-go-foreground" : status === "lost" ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-standby text-background";
  return (
    <div role="status" className={`flex items-center justify-between px-4 py-2 text-sm font-black ${cls}`}>
      <span>{status === "synced" ? "🛡️ HOT-STANDBY · Spejler master-pulten (GO er slået fra her)" : status === "lost" ? "⚠️ MASTER TABT – tryk 'Overtag master' for at køre showet herfra" : "🛡️ HOT-STANDBY · Forbinder til master…"}</span>
      <button onClick={onStop} className="rounded bg-background px-3 py-1 text-foreground">Overtag master</button>
    </div>
  );
}
