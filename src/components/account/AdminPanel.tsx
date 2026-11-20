import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Stats = {
  users_total: number; users_new_7: number; users_new_30: number; users_active_7: number; users_active_30: number;
  pro_active: number; shows_total: number; devices_total: number; tickets_open: number;
  features_30: { feature: string; count: number }[]; features_all: { feature: string; count: number }[];
};
type LicOverview = {
  by_plan: { plan: string; count: number }[];
  trials: { days_left: number; count: number }[];
  keys: { code: string; plan: string; note: string; used: number; max: number; expires_at: string | null; duration_days: number | null }[];
};
const PLAN_LABEL: Record<string, string> = { pro_lifetime: "Livstid", lifetime: "Livstid (kode)", pro_yearly: "Årlig", pro_monthly: "Månedlig", yearly: "Årlig (kode)", monthly: "Månedlig (kode)" };
type Ticket = { id: string; ticket_no: number; kind: string; subject: string; body: string; email: string | null; system_info: string | null; status: string; created_at: string };

const FEATURE_LABEL: Record<string, string> = {
  "pult.go": "Pult-sessioner med GO", "monitor.connect": "Scenemonitor-forbindelser",
  "cue.audio": "Lyd-cues oprettet", "cue.midi": "MIDI-cues oprettet", "cue.memo": "Memo-cues oprettet",
  "cue.group": "Gruppe-cues oprettet", "cue.fade": "Fade-cues oprettet", "cue.stop": "Stop-cues oprettet", "cue.wait": "Wait-cues oprettet",
  "window.free": "Vinduer: frit", "window.grid": "Vinduer: gitter", "window.magnet": "Vinduer: magnet", "window.both": "Vinduer: gitter + magnet",
  "timefmt.hms": "Tidsformat t:m:s", "timefmt.sec": "Tidsformat sekunder",
  "autosave.on": "Auto-gem slået til", "autosave.off": "Auto-gem slået fra", "file.save_as": "Gem som…",
};
const KIND: Record<string, string> = { bug: "Fejl", feature: "Forslag", support: "Hjælp" };
const STATUS: Record<string, string> = { open: "Åben", in_progress: "I gang", closed: "Lukket" };

/** Only rendered for admins; all data comes from admin-checked database functions. */
export function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [range, setRange] = useState<"30" | "all">("30");
  const [lic, setLic] = useState<LicOverview | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    const [s, t, l] = await Promise.all([supabase.rpc("admin_stats"), supabase.rpc("admin_tickets"), supabase.rpc("admin_license_overview")]);
    if (l.data) setLic(l.data as unknown as LicOverview);
    if (s.data) setStats(s.data as unknown as Stats);
    if (t.data) setTickets(t.data as Ticket[]);
  };
  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (data) { setIsAdmin(true); void load(); }
    })();
  }, []);
  if (!isAdmin) return null;

  const setStatus = async (id: string, status: string) => {
    await supabase.rpc("admin_set_ticket_status", { _id: id, _status: status });
    setTickets((l) => l.map((x) => (x.id === id ? { ...x, status } : x)));
  };
  const feats = stats ? (range === "30" ? stats.features_30 : stats.features_all) : [];
  const max = Math.max(1, ...feats.map((f) => Number(f.count)));
  const Box = ({ label, value }: { label: string; value: number | undefined }) => (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-2xl font-black">{value ?? "–"}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <section className="flex flex-col gap-4 rounded-xl border-2 border-go/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-go">Admin · statistik (anonym)</h2>
        <button onClick={() => void load()} className="rounded bg-secondary px-2 py-1 text-xs font-semibold">Opdatér</button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Box label="Brugere i alt" value={stats?.users_total} />
        <Box label="Nye (7 dage)" value={stats?.users_new_7} />
        <Box label="Nye (30 dage)" value={stats?.users_new_30} />
        <Box label="Aktive (7 dage)" value={stats?.users_active_7} />
        <Box label="Aktive (30 dage)" value={stats?.users_active_30} />
        <Box label="Pro-licenser" value={stats?.pro_active} />
        <Box label="Gemte shows" value={stats?.shows_total} />
        <Box label="Pult-computere" value={stats?.devices_total} />
        <Box label="Åbne tickets" value={stats?.tickets_open} />
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-bold">Brug af funktioner</h3>
          {(["30", "all"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
              className={`rounded px-2 py-0.5 text-xs ${range === r ? "bg-go text-go-foreground" : "bg-secondary"}`}>{r === "30" ? "30 dage" : "Altid"}</button>
          ))}
        </div>
        {feats.length === 0 ? <p className="text-sm text-muted-foreground">Ingen data endnu.</p> : (
          <ul className="flex flex-col gap-1">
            {feats.map((f) => (
              <li key={f.feature} className="text-sm">
                <div className="flex justify-between"><span>{FEATURE_LABEL[f.feature] ?? f.feature}</span><span className="font-mono">{f.count}</span></div>
                <div className="h-1.5 rounded bg-secondary"><div className="h-1.5 rounded bg-go" style={{ width: `${(Number(f.count) / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-bold">Aktive licenser</h3>
          {!lic?.by_plan.length ? <p className="text-sm text-muted-foreground">Ingen aktive licenser.</p> : (
            <ul className="flex flex-col gap-1 text-sm">
              {lic.by_plan.map((p) => (
                <li key={p.plan} className="flex justify-between"><span>{PLAN_LABEL[p.plan] ?? p.plan}</span><span className="font-mono">{p.count}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold">I prøveperiode ({lic?.trials.reduce((a, t) => a + Number(t.count), 0) ?? 0})</h3>
          {!lic?.trials.length ? <p className="text-sm text-muted-foreground">Ingen i prøveperiode.</p> : (
            <ul className="flex flex-col gap-1 text-sm">
              {lic.trials.map((t) => (
                <li key={t.days_left} className="flex justify-between"><span>{t.days_left} {t.days_left === 1 ? "dag" : "dage"} tilbage</span><span className="font-mono">{t.count}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold">Licenskoder</h3>
        {!lic?.keys.length ? <p className="text-sm text-muted-foreground">Ingen koder oprettet.</p> : (
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {lic.keys.map((k) => (
              <li key={k.code} className="flex flex-wrap items-center gap-2 p-2">
                <span className="font-mono text-xs">{k.code}</span>
                <span className="flex-1 break-words text-muted-foreground">{k.note || "–"} · {PLAN_LABEL[k.plan] ?? k.plan}{k.duration_days ? ` · ${k.duration_days} dage` : ""}{k.expires_at ? ` · udløber ${new Date(k.expires_at).toLocaleDateString("da-DK")}` : ""}</span>
                <span className={`font-mono ${k.used >= k.max ? "text-destructive" : ""}`}>{k.used} / {k.max}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold">Support-tickets</h3>
        {tickets.length === 0 ? <p className="text-sm text-muted-foreground">Ingen tickets.</p> : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {tickets.map((t) => (
              <li key={t.id} className="p-3 text-sm">
                <button onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full flex-wrap items-center gap-2 text-left">
                  <span className="font-mono text-xs text-muted-foreground">#SC-{t.ticket_no}</span>
                  <span className="rounded bg-secondary px-1.5 text-xs">{KIND[t.kind] ?? t.kind}</span>
                  <span className="flex-1 font-semibold break-words">{t.subject}</span>
                  <span className={`text-xs ${t.status === "open" ? "text-go" : "text-muted-foreground"}`}>{STATUS[t.status] ?? t.status}</span>
                </button>
                {open === t.id && (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="whitespace-pre-wrap break-words">{t.body}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("da-DK")}{t.email && <> · <a className="underline" href={`mailto:${t.email}?subject=Re: #SC-${t.ticket_no} ${encodeURIComponent(t.subject)}`}>Svar {t.email}</a></>}</p>
                    {t.system_info && <p className="break-all text-xs text-muted-foreground">{t.system_info}</p>}
                    <div className="flex gap-2">
                      {Object.keys(STATUS).map((s) => (
                        <button key={s} onClick={() => void setStatus(t.id, s)} disabled={t.status === s}
                          className="rounded border border-border px-2 py-1 text-xs disabled:bg-secondary disabled:font-bold">{STATUS[s]}</button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
