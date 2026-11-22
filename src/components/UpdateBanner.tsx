import { useEffect, useState } from "react";
import { isDesktop } from "@/lib/desktop";

type Inv = (cmd: string, args?: unknown) => Promise<unknown>;
type Upd = { version: string; current: string; notes?: string };
const inv: Inv = (c, a) => (globalThis as unknown as { __TAURI_INTERNALS__: { invoke: Inv } }).__TAURI_INTERNALS__.invoke(c, a);

const T: Record<string, [string, string, string, string]> = {
  da: ["Ny version af StageCue", "Opdater og genstart", "Senere", "Henter opdatering…"],
  en: ["New StageCue version", "Update and restart", "Later", "Downloading update…"],
  de: ["Neue StageCue-Version", "Aktualisieren und neu starten", "Später", "Update wird geladen…"],
  sv: ["Ny version av StageCue", "Uppdatera och starta om", "Senare", "Hämtar uppdatering…"],
  nb: ["Ny versjon av StageCue", "Oppdater og start på nytt", "Senere", "Henter oppdatering…"],
  fr: ["Nouvelle version de StageCue", "Mettre à jour et redémarrer", "Plus tard", "Téléchargement…"],
  es: ["Nueva versión de StageCue", "Actualizar y reiniciar", "Más tarde", "Descargando…"],
};

/** Windows app only: checks GitHub for a newer signed release at start and every 6 hours. */
export function UpdateBanner() {
  const [u, setU] = useState<Upd | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!isDesktop() || !navigator.onLine) return;
    const check = () => inv("update_check").then((r) => r && setU(r as Upd)).catch(() => {});
    const t0 = setTimeout(check, 5000);
    const iv = setInterval(check, 6 * 3600 * 1000);
    return () => { clearTimeout(t0); clearInterval(iv); };
  }, []);
  if (!u) return null;
  const t = T[(navigator.language || "en").slice(0, 2)] ?? T["en"]!;
  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg">
      <div className="font-semibold">{t[0]} {u.version}</div>
      <div className="text-xs text-muted-foreground">v{u.current} → v{u.version}</div>
      {err && <div className="mt-1 text-xs text-destructive">{err}</div>}
      <div className="mt-3 flex gap-2">
        <button
          disabled={busy}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60"
          onClick={() => { setBusy(true); setErr(""); inv("update_install").catch((e) => { setErr(String(e)); setBusy(false); }); }}
        >{busy ? t[3] : t[1]}</button>
        {!busy && <button className="rounded-md px-3 py-1.5 text-sm hover:bg-muted" onClick={() => setU(null)}>{t[2]}</button>}
      </div>
    </div>
  );
}
