import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { DataConnection, Peer as PeerT } from "peerjs";
import { PEER_PREFIX, makeCode, type RemoteCmd, type RemoteState } from "@/lib/show/remote";

const CODE_KEY = "stagecue.remotecode";

export function RemoteHost({ state, onCmd }: { state: RemoteState; onCmd: (c: RemoteCmd) => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState("Starter…");
  const [count, setCount] = useState(0);
  const [qr, setQr] = useState("");
  const [enabled, setEnabled] = useState(true);
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
        conn.on("open", () => {
          conns.current.add(conn);
          setCount(conns.current.size);
          conn.send({ t: "state", s: stateRef.current });
        });
        conn.on("data", (d) => cmdRef.current(d as RemoteCmd));
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
    conns.current.forEach((c) => c.open && c.send({ t: "state", s: state }));
  }, [state]);

  const newCode = () => { const c = makeCode(); localStorage.setItem(CODE_KEY, c); setCode(c); };

  return (
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
      <div className="text-xs text-muted-foreground">Kræver internet på både computer og telefon.</div>
    </div>
  );
}
