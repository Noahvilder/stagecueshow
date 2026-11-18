import { useState } from "react";
import { useT } from "@/lib/site/i18n";

type Kind = "bug" | "feature" | "support";

/** Ticket form: opens the user's mail app with a prefilled ticket incl. system info. */
export function FeedbackForm() {
  const t = useT();
  const [kind, setKind] = useState<Kind>("feature");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const kinds: Record<Kind, string> = {
    bug: t({ en: "Report a bug", da: "Fejlmeld", de: "Fehler melden", fr: "Signaler un bug", es: "Informar error", sv: "Rapportera fel", no: "Meld feil" }),
    feature: t({ en: "Suggest a change", da: "Foreslå en ændring", de: "Änderung vorschlagen", fr: "Suggérer", es: "Sugerir cambio", sv: "Föreslå ändring", no: "Foreslå endring" }),
    support: t({ en: "Get help", da: "Få hjælp", de: "Hilfe", fr: "Aide", es: "Ayuda", sv: "Få hjälp", no: "Få hjelp" }),
  };
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const info = `\n\n---\nType: ${kind}\nBrowser: ${navigator.userAgent}\nScreen: ${screen.width}x${screen.height}\nLanguage: ${navigator.language}`;
    window.location.href = `mailto:support@stagecue.app?subject=${encodeURIComponent(`[${kind}] ${subject}`)}&body=${encodeURIComponent(body + info)}`;
  };
  return (
    <form onSubmit={send} className="mt-4 space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(kinds) as Kind[]).map((k) => (
          <button type="button" key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
            className={`rounded px-3 py-1.5 text-sm font-semibold ${kind === k ? "bg-go text-go-foreground" : "border border-border text-muted-foreground"}`}>{kinds[k]}</button>
        ))}
      </div>
      <input required value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120}
        placeholder={t({ en: "Subject", da: "Emne", de: "Betreff", fr: "Sujet", es: "Asunto", sv: "Ämne", no: "Emne" })}
        className="w-full rounded border border-input bg-background px-3 py-2" />
      <textarea required value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000}
        placeholder={t({ en: "Describe what happened or what you'd like to see", da: "Beskriv hvad der skete, eller hvad du ønsker", de: "Beschreibe das Problem oder deinen Wunsch" })}
        className="w-full rounded border border-input bg-background px-3 py-2" />
      <button className="rounded bg-go px-4 py-2 font-bold text-go-foreground">{t({ en: "Send", da: "Send", de: "Senden", fr: "Envoyer", es: "Enviar", sv: "Skicka", no: "Send" })}</button>
      <p className="text-xs text-muted-foreground">{t({ en: "System info is added automatically to help us fix issues.", da: "Systeminfo tilføjes automatisk, så vi hurtigere kan hjælpe." })}</p>
    </form>
  );
}
