import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import type { DataConnection, Peer as PeerT } from "peerjs";
import { PEER_PREFIX, makeCode, type RemoteCmd, type RemoteState } from "@/lib/show/remote";

const CODE_KEY = "stagecue.remotecode";

export function RemoteHost({ showId, state, onCmd, getAudio, renderPanel }: { showId: string; state: RemoteState; onCmd: (c: RemoteCmd) => void; getAudio: (cueId: string) => Promise<Blob | undefined>; renderPanel?: (panel: ReactNode) => ReactNode }) {
  const audioRef = useRef(getAudio);
  audioRef.current = getAudio;
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState("Starter…");
  const [count, setCount] = useState(0);
  const [qr, setQr] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [monitor, setMonitor] = useState("");
  const [monitorQr, setMonitorQr] = useState("");
  const conns = useRef(new Set<DataConnection>());
  const cmdRef = useRef(onCmd);
  cmdRef.current = onCmd;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let c = localStorage.getItem(CODE_KEY);
    if (!c) { c = makeCode(); localStorage.setItem(CODE_KEY, c); }
    setCode(c);
  }, []);

  useEffect(() => {
    if (!code || !enabled) return;
    let peer: PeerT | null = null;
    let dead = false;
    let retry: ReturnType<typeof setTimeout>;
    const url = `${location.origin}/remote?code=${code}`;
    QRCode.toDataURL(url, { margin: 1, width: 220 }).then(setQr);
    const start = async () => {
      const { Peer } = await import("peerjs");
      if (dead) return;
      peer = new Peer(PEER_PREFIX + code);
      peer.on("open", () => setStatus("Klar – venter på telefon"));
      peer.on("connection", (conn) => {
        const viewer = conn.metadata?.role === "viewer";
        conn.on("open", () => {
          conns.current.add(conn);
          setCount(conns.current.size);
          conn.send({ t: "state", s: stateRef.current });
        });
        conn.on("data", async (d) => {
          if (viewer) return;
          const c = d as RemoteCmd;
          if (c.t === "getAudio") {
            const b = await audioRef.current(c.id).catch(() => undefined);
            conn.send({ t: "audio", id: c.id, mime: b?.type || "audio/mpeg", buf: b ? await b.arrayBuffer() : null });
          } else cmdRef.current(c);
        });
        conn.on("close", () => { conns.current.delete(conn); setCount(conns.current.size); });
      });
      peer.on("disconnected", () => { setStatus("Genforbinder…"); peer?.reconnect(); });
      peer.on("error", (e) => {
        setStatus("Fejl: " + e.type);
        if (e.type === "unavailable-id" || e.type === "network" || e.type === "server-error") {
          peer?.destroy();
          retry = setTimeout(start, 3000);
        }
      });
    };
    start();
    return () => { dead = true; clearTimeout(retry); peer?.destroy(); conns.current.clear(); setCount(0); };
  }, [code, enabled]);

  useEffect(() => {
    if (code) supabase.from("shows").update({ remote_code: enabled ? code : null }).eq("id", showId).then(() => {});
  }, [code, enabled, showId]);

  useEffect(() => {
    conns.current.forEach((c) => c.open && c.send({ t: "state", s: state }));
  }, [state]);

  const newCode = () => { const c = makeCode(); localStorage.setItem(CODE_KEY, c); setCode(c); };

  useEffect(() => {
    let dead = false;
    setMonitorQr("");
    if (code && monitor) QRCode.toDataURL(`${location.origin}/view?code=${code}&monitor=${encodeURIComponent(monitor)}`, { margin: 1, width: 220 }).then((url) => { if (!dead) setMonitorQr(url); }).catch(() => {});
    return () => { dead = true; };
  }, [code, monitor]);

  const panel = (
    <div className="flex flex-col items-center gap-3 p-3 text-center">
      <div className={`w-full rounded px-2 py-1 text-sm font-bold ${count ? "bg-go text-go-foreground" : "bg-muted"}`}>
        {count ? `● ${count} telefon${count > 1 ? "er" : ""} forbundet` : status}
      </div>
      {enabled && qr && <img src={qr} alt="QR-kode til telefon" className="rounded bg-foreground p-1" width={200} height={200} />}
      <div className="text-xs text-muted-foreground">Scan med telefonen, eller åbn /remote og skriv koden:</div>
      <div className="font-mono text-4xl font-black tracking-[0.3em] text-standby">{code}</div>
      <div className="flex gap-2">
        <button onClick={newCode} className="rounded bg-secondary px-3 py-1 text-xs font-semibold">Ny kode</button>
        <button onClick={() => setEnabled((e) => !e)} className="rounded bg-secondary px-3 py-1 text-xs font-semibold">{enabled ? "Slå fra" : "Slå til"}</button>
      </div>
      <a href={`/view?code=${code}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-standby underline">🎤 Scenemonitor (lyrics): /view?code={code}</a>
      <select aria-label="Personlig monitor" value={monitor} onChange={(e) => setMonitor(e.target.value)} className="w-full rounded border border-input bg-input p-2"><option value="">Vælg scenemonitor…</option>{state.monitors?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      {enabled && monitor && <><a className="text-sm font-bold text-standby underline" href={`/view?code=${code}&monitor=${encodeURIComponent(monitor)}`} target="_blank" rel="noreferrer">Åbn {state.monitors?.find((m) => m.id === monitor)?.name}</a>{monitorQr && <img src={monitorQr} width={200} height={200} alt="QR-kode til personlig monitor" />}<Button variant="secondary" onClick={() => navigator.clipboard.writeText(`${location.origin}/view?code=${code}&monitor=${encodeURIComponent(monitor)}`).catch(() => {})}>Kopiér monitorlink</Button></>}
      <div className="text-xs text-muted-foreground">Kræver internet på både computer og telefon.</div>
    </div>
  );
  return renderPanel ? renderPanel(panel) : panel;
}
