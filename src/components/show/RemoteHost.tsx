import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import type { DataConnection, Peer as PeerT } from "peerjs";
import { isDesktop } from "@/lib/desktop";
import { PEER_PREFIX, makeCode, isValidCode, type RemoteCmd, type RemoteState } from "@/lib/show/remote";

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
  const roles = useRef(new Map<DataConnection, string>());
  const [roleCount, setRoleCount] = useState<Record<string, number>>({});
  const recount = () => { const r: Record<string, number> = {}; roles.current.forEach((m) => { r[m] = (r[m] ?? 0) + 1; }); setRoleCount(r); };
  const cmdRef = useRef(onCmd);
  cmdRef.current = onCmd;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let dead = false;
    // Fast kode pr. show: genbrug den gemte kode, så telefoner altid kan finde showet igen.
    supabase.from("shows").select("remote_code").eq("id", showId).single().then(({ data }) => {
      if (dead) return;
      const key = CODE_KEY + "." + showId;
      const c = [data?.remote_code, localStorage.getItem(key)].find((x): x is string => !!x && isValidCode(x));
      setCode(c ?? makeCode());
    });
    return () => { dead = true; };
  }, [showId]);

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
        // Admin-lås: fjernbetjening kræver login som samme bruger som pulten.
        let authed: Promise<boolean> = Promise.resolve(viewer);
        if (!viewer) {
          const token = typeof conn.metadata?.token === "string" ? conn.metadata.token : "";
          authed = token ? Promise.all([supabase.auth.getUser(token), supabase.auth.getUser()]).then(([a, b]) => !!a.data.user && a.data.user.id === b.data.user?.id).catch(() => false) : Promise.resolve(false);
        }
        conn.on("open", async () => {
          if (!(await authed)) { conn.send({ t: "denied" }); setTimeout(() => conn.close(), 300); return; }
          conns.current.add(conn);
          setCount(conns.current.size);
          conn.send({ t: "state", s: stateRef.current });
        });
        conn.on("data", async (d) => {
          const c = d as RemoteCmd;
          if (c.t === "viewerRole") { if (viewer) { roles.current.set(conn, c.monitor); recount(); } return; }
          if (viewer && c.t !== "setMonitorNote") return;
          if (!viewer && !(await authed)) return;
          if (c.t === "getAudio") {
            const b = await audioRef.current(c.id).catch(() => undefined);
            conn.send({ t: "audio", id: c.id, mime: b?.type || "audio/mpeg", buf: b ? await b.arrayBuffer() : null });
          } else cmdRef.current(c);
        });
        conn.on("close", () => { conns.current.delete(conn); roles.current.delete(conn); recount(); setCount(conns.current.size); });
      });
      peer.on("disconnected", () => { setStatus("Genforbinder…"); if (!dead) setTimeout(() => { if (!dead && peer && !peer.destroyed) peer.reconnect(); }, 1000); });
      peer.on("error", (e) => {
        setStatus(e.type === "unavailable-id" ? "Backup: en anden pult kører koden – overtager automatisk hvis den falder ud" : "Fejl: " + e.type);
        if (e.type !== "peer-unavailable") {
          peer?.destroy();
          retry = setTimeout(start, 3000);
        }
      });
    };
    start();
    return () => { dead = true; clearTimeout(retry); peer?.destroy(); conns.current.clear(); roles.current.clear(); setRoleCount({}); setCount(0); };
  }, [code, enabled]);

  useEffect(() => {
    if (code) localStorage.setItem(CODE_KEY + "." + showId, code);
    if (code && enabled) supabase.from("shows").update({ remote_code: code }).eq("id", showId).then(() => {});
  }, [code, enabled, showId]);

  useEffect(() => {
    conns.current.forEach((c) => c.open && c.send({ t: "state", s: state }));
  }, [state]);
  // Heartbeat: phones show "waiting for signal" if this stops.
  useEffect(() => { const t = setInterval(() => conns.current.forEach((c) => c.open && c.send({ t: "state", s: stateRef.current })), 2000); return () => clearInterval(t); }, []);

  // Lokal Wi-Fi-monitor (kun Windows-appen): virker uden internet.
  const [local, setLocal] = useState<{ url: string; qr: string; n: number } | null>(null);
  useEffect(() => {
    const t = (window as unknown as { __TAURI_INTERNALS__?: { invoke: (c: string, a?: unknown) => Promise<unknown> } }).__TAURI_INTERNALS__;
    if (!isDesktop() || !t) return;
    let dead = false;
    let base = "";
    t.invoke("local_info").then(async (r) => {
      const i = r as { ip: string; port: number };
      if (dead || !i.ip) return;
      base = `http://${i.ip}:${i.port}/`;
      setLocal({ url: base, qr: await QRCode.toDataURL(base, { margin: 1, width: 220 }), n: 0 });
    }).catch(() => {});
    const push = () => t.invoke("local_state", { json: JSON.stringify(stateRef.current) }).then((n) => { if (!dead && base) setLocal((l) => (l && l.n !== n ? { ...l, n: n as number } : l)); }).catch(() => {});
    push();
    const iv = setInterval(push, 1000);
    return () => { dead = true; clearInterval(iv); };
  }, []);
  const localUrl = local ? local.url + (monitor ? `?monitor=${encodeURIComponent(monitor)}` : "") : "";
  const [localQr, setLocalQr] = useState("");
  useEffect(() => { if (localUrl) QRCode.toDataURL(localUrl, { margin: 1, width: 220 }).then(setLocalQr).catch(() => {}); }, [localUrl]);

  const newCode = () => { if (confirm("Ny kode afbryder alle parrede telefoner og monitors. Fortsæt?")) setCode(makeCode()); };

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
      {(state.monitors?.length ?? 0) > 0 && <div className="w-full rounded border border-border p-2 text-left text-sm">
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Forbundne scenemonitors</div>
        {[...(state.monitors ?? []), { id: "", name: "Fælles / ingen rolle" }].map((m) => { const n = roleCount[m.id] ?? 0; return <div key={m.id} className="flex justify-between"><span>{m.name}</span><span className={n ? "font-bold text-go" : "text-muted-foreground"}>{n ? `● ${n} online` : "–"}</span></div>; })}
      </div>}
      {enabled && qr && <img src={qr} alt="QR-kode til telefon" className="rounded bg-foreground p-1" width={200} height={200} />}
      <div className="text-xs text-muted-foreground">Scan én gang – telefonen husker showet og forbinder selv næste gang. Koden er fast for dette show:</div>
      <div className="font-mono text-4xl font-black tracking-[0.3em] text-standby">{code}</div>
      <div className="flex gap-2">
        <button onClick={newCode} className="rounded bg-secondary px-3 py-1 text-xs font-semibold">Ny kode</button>
        <button onClick={() => setEnabled((e) => !e)} className="rounded bg-secondary px-3 py-1 text-xs font-semibold">{enabled ? "Slå fra" : "Slå til"}</button>
      </div>
      <a href={`/view?code=${code}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-standby underline">🎤 Scenemonitor (lyrics): /view?code={code}</a>
      <select aria-label="Personlig monitor" value={monitor} onChange={(e) => setMonitor(e.target.value)} className="w-full rounded border border-input bg-input p-2"><option value="">Vælg scenemonitor…</option>{state.monitors?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      {enabled && monitor && <><a className="text-sm font-bold text-standby underline" href={`/view?code=${code}&monitor=${encodeURIComponent(monitor)}`} target="_blank" rel="noreferrer">Åbn {state.monitors?.find((m) => m.id === monitor)?.name}</a>{monitorQr && <img src={monitorQr} width={200} height={200} alt="QR-kode til personlig monitor" />}<Button variant="secondary" onClick={() => navigator.clipboard.writeText(`${location.origin}/view?code=${code}&monitor=${encodeURIComponent(monitor)}`).catch(() => {})}>Kopiér monitorlink</Button></>}
      <div className="text-xs text-muted-foreground">Koden ovenfor kræver internet på både computer og telefon.</div>
      {local && <div className="w-full rounded border border-border p-2 text-sm">
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Uden internet – samme Wi-Fi</div>
        {localQr && <img src={localQr} alt="QR-kode til lokal scenemonitor" className="mx-auto rounded bg-foreground p-1" width={180} height={180} />}
        <div className="font-mono font-bold text-standby">{localUrl}</div>
        <div className={local.n ? "font-bold text-go" : "text-xs text-muted-foreground"}>{local.n ? `● ${local.n} lokal${local.n > 1 ? "e" : ""} monitor${local.n > 1 ? "s" : ""}` : "Scan med en telefon på samme Wi-Fi som computeren."}</div>
      </div>}
    </div>
  );
  return renderPanel ? renderPanel(panel) : panel;
}
