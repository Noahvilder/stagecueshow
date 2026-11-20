import { useState } from "react";
import { useT } from "@/lib/site/i18n";
import { supabase } from "@/integrations/supabase/client";

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
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [err, setErr] = useState(false);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(false);
    const info = `Browser: ${navigator.userAgent} | Screen: ${screen.width}x${screen.height} | Lang: ${navigator.language} | Page: ${location.pathname}`.slice(0, 1000);
    const { data, error } = await supabase.rpc("submit_ticket", { _kind: kind, _subject: subject, _body: body, _email: email, _system_info: info });
    setBusy(false);
    if (error) { setErr(true); return; }
    setDone(Number(data)); setSubject(""); setBody("");
  };
  if (done) return (
    <div className="mt-4 rounded-xl border border-border p-4">
      <p className="text-lg font-bold">{t({ en: "Thanks! Ticket", da: "Tak! Sag", de: "Danke! Ticket", fr: "Merci ! Ticket", es: "¡Gracias! Ticket", sv: "Tack! Ärende", no: "Takk! Sak" })} #SC-{done}</p>
      <p className="text-sm text-muted-foreground">{t({ en: "We'll get back to you as soon as possible.", da: "Vi vender tilbage hurtigst muligt.", de: "Wir melden uns so schnell wie möglich.", fr: "Nous vous répondrons dès que possible.", es: "Nos pondremos en contacto contigo lo antes posible.", sv: "Vi återkommer till dig så snart som möjligt.", no: "Vi tar kontakt så snart som mulig." })}</p>
      <button onClick={() => setDone(null)} className="mt-3 rounded border border-border px-3 py-1.5 text-sm">{t({ en: "Send another", da: "Send en til", de: "Weitere senden", fr: "En envoyer un autre", es: "Enviar otro", sv: "Skicka ett till", no: "Send en til" })}</button>
    </div>
  );
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
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255}
        placeholder={t({ en: "Your email (optional, for a reply)", da: "Din e-mail (valgfri, for svar)", de: "Deine E-Mail (optional)", fr: "Votre e-mail (facultatif, pour une réponse)", es: "Tu correo electrónico (opcional, para recibir respuesta)", sv: "Din e-postadress (valfritt, för svar)", no: "E-postadressen din (valgfritt, for svar)" })}
        className="w-full rounded border border-input bg-background px-3 py-2" />
      <textarea required value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000}
        placeholder={t({ en: "Describe what happened or what you'd like to see", da: "Beskriv hvad der skete, eller hvad du ønsker", de: "Beschreibe das Problem oder deinen Wunsch", fr: "Décrivez ce qui s'est passé ou ce que vous aimeriez voir", es: "Describe qué ocurrió o qué te gustaría ver", sv: "Beskriv vad som hände eller vad du skulle vilja se", no: "Beskriv hva som skjedde eller hva du ønsker å se" })}
        className="w-full rounded border border-input bg-background px-3 py-2" />
      <button disabled={busy} className="rounded bg-go disabled:opacity-50 px-4 py-2 font-bold text-go-foreground">{t({ en: "Send", da: "Send", de: "Senden", fr: "Envoyer", es: "Enviar", sv: "Skicka", no: "Send" })}</button>
      {err && <p className="text-sm text-destructive">{t({ en: "Could not send. Please try again.", da: "Kunne ikke sende. Prøv igen.", de: "Senden fehlgeschlagen.", fr: "Impossible d'envoyer. Veuillez réessayer.", es: "No se pudo enviar. Inténtalo de nuevo.", sv: "Kunde inte skicka. Försök igen.", no: "Kunne ikke sende. Vennligst prøv igjen." })}</p>}
      <p className="text-xs text-muted-foreground">{t({ en: "System info is added automatically to help us fix issues.", da: "Systeminfo tilføjes automatisk, så vi hurtigere kan hjælpe." })}</p>
    </form>
  );
}
