import { useEffect, useState } from "react";
import { LANGS, detectLang, type Lang } from "@/lib/site/i18n";

/** The console is written in Danish; this maps Danish UI strings to the other languages. */
type Row = [en: string, de: string, fr: string, es: string, sv: string, no: string];
const D: Record<string, Row> = {
  "Filer": ["File", "Datei", "Fichier", "Archivo", "Arkiv", "Fil"],
  "Rediger": ["Edit", "Bearbeiten", "Édition", "Editar", "Redigera", "Rediger"],
  "Værktøjer": ["Tools", "Werkzeuge", "Outils", "Herramientas", "Verktyg", "Verktøy"],
  "Visning": ["View", "Ansicht", "Affichage", "Ver", "Visa", "Visning"],
  "Vinduer": ["Windows", "Fenster", "Fenêtres", "Ventanas", "Fönster", "Vinduer"],
  "Indstillinger": ["Settings", "Einstellungen", "Réglages", "Ajustes", "Inställningar", "Innstillinger"],
  "Hjælp": ["Help", "Hilfe", "Aide", "Ayuda", "Hjälp", "Hjelp"],
  "Sprog": ["Language", "Sprache", "Langue", "Idioma", "Språk", "Språk"],
  "Åbn show…": ["Open show…", "Show öffnen…", "Ouvrir un show…", "Abrir show…", "Öppna show…", "Åpne show…"],
  "Gem show": ["Save show", "Show speichern", "Enregistrer", "Guardar show", "Spara show", "Lagre show"],
  "Gem som…": ["Save as…", "Speichern unter…", "Enregistrer sous…", "Guardar como…", "Spara som…", "Lagre som…"],
  "Eksportér backup m. lyd (.stagecue)…": ["Export backup with audio (.stagecue)…", "Backup mit Audio exportieren (.stagecue)…", "Exporter sauvegarde avec audio (.stagecue)…", "Exportar copia con audio (.stagecue)…", "Exportera backup med ljud (.stagecue)…", "Eksporter backup med lyd (.stagecue)…"],
  "Importér setliste…": ["Import setlist…", "Setliste importieren…", "Importer setlist…", "Importar setlist…", "Importera setlista…", "Importer setliste…"],
  "📋 Importér setliste…": ["📋 Import setlist…", "📋 Setliste importieren…", "📋 Importer setlist…", "📋 Importar setlist…", "📋 Importera setlista…", "📋 Importer setliste…"],
  "Tilbage til shows": ["Back to shows", "Zurück zu Shows", "Retour aux shows", "Volver a shows", "Tillbaka till shower", "Tilbake til show"],
  "Lås show op": ["Unlock show", "Show entsperren", "Déverrouiller", "Desbloquear show", "Lås upp show", "Lås opp show"],
  "Lås show til live": ["Lock show for live", "Show für Live sperren", "Verrouiller pour le live", "Bloquear show en vivo", "Lås show för live", "Lås show for live"],
  "⏱️ Click / Optælling…": ["⏱️ Click / Count-in…", "⏱️ Click / Einzähler…", "⏱️ Clic / Décompte…", "⏱️ Claqueta / Cuenta…", "⏱️ Klick / Inräkning…", "⏱️ Klikk / Inntelling…"],
  "⌨️ Genveje…": ["⌨️ Shortcuts…", "⌨️ Tastenkürzel…", "⌨️ Raccourcis…", "⌨️ Atajos…", "⌨️ Genvägar…", "⌨️ Snarveier…"],
  "⌨️ Tastaturgenveje": ["⌨️ Keyboard shortcuts", "⌨️ Tastenkürzel", "⌨️ Raccourcis clavier", "⌨️ Atajos de teclado", "⌨️ Kortkommandon", "⌨️ Hurtigtaster"],
  "🟢 Simpel visning": ["🟢 Simple layout", "🟢 Einfache Ansicht", "🟢 Vue simple", "🟢 Vista simple", "🟢 Enkel vy", "🟢 Enkel visning"],
  "⚙️ Avanceret visning": ["⚙️ Advanced layout", "⚙️ Erweiterte Ansicht", "⚙️ Vue avancée", "⚙️ Vista avanzada", "⚙️ Avancerad vy", "⚙️ Avansert visning"],
  "Nulstil layout": ["Reset layout", "Layout zurücksetzen", "Réinitialiser", "Restablecer diseño", "Återställ layout", "Tilbakestill layout"],
  "Frit flydende": ["Free floating", "Frei schwebend", "Flottant libre", "Flotante libre", "Fritt flytande", "Fritt flytende"],
  "Gitter-snap": ["Grid snap", "Raster-Snap", "Aimanter à la grille", "Ajuste a cuadrícula", "Rutnätssnap", "Rutenett-snap"],
  "Magnetisk kant-snap": ["Magnetic edge snap", "Magnetische Kanten", "Bords magnétiques", "Bordes magnéticos", "Magnetiska kanter", "Magnetiske kanter"],
  "Gitter + magnet": ["Grid + magnet", "Raster + Magnet", "Grille + aimant", "Cuadrícula + imán", "Rutnät + magnet", "Rutenett + magnet"],
  "Træk-håndtag": ["Drag handle", "Ziehgriff", "Poignée", "Asa de arrastre", "Draghandtag", "Drahåndtak"],
  "Cue-nummer": ["Cue number", "Cue-Nummer", "Numéro de cue", "Número de cue", "Cuenummer", "Cue-nummer"],
  "Detaljer": ["Details", "Details", "Détails", "Detalles", "Detaljer", "Detaljer"],
  "Stikord": ["Cue trigger", "Stichwort", "Repère", "Pie", "Stickord", "Stikkord"],
  "Hjælpetekster": ["Help tips", "Hilfetexte", "Bulles d'aide", "Textos de ayuda", "Hjälptexter", "Hjelpetekster"],
  "Scene": ["Stage", "Bühne", "Scène", "Escenario", "Scen", "Scene"],
  "Setliste": ["Setlist", "Setliste", "Setlist", "Setlist", "Setlista", "Setliste"],
  "Telefon": ["Phone", "Handy", "Téléphone", "Móvil", "Telefon", "Telefon"],
  "Scene · Nu & Næste": ["Stage · Now & Next", "Bühne · Jetzt & Nächstes", "Scène · Maintenant & Suivant", "Escenario · Ahora y Siguiente", "Scen · Nu & Nästa", "Scene · Nå & Neste"],
  "Setliste & Cues": ["Setlist & Cues", "Setliste & Cues", "Setlist & Cues", "Setlist y Cues", "Setlista & Cues", "Setliste & Cues"],
  "Telefon & scenemonitors": ["Phone & stage monitors", "Handy & Bühnenmonitore", "Téléphone & retours", "Móvil y monitores", "Telefon & scenmonitorer", "Telefon & scenemonitorer"],
  "Lyd, MIDI, I/O-navne & monitorer…": ["Audio, MIDI, I/O names & monitors…", "Audio, MIDI, I/O-Namen & Monitore…", "Audio, MIDI, noms E/S & retours…", "Audio, MIDI, nombres E/S y monitores…", "Ljud, MIDI, I/O-namn & monitorer…", "Lyd, MIDI, I/O-navn & monitorer…"],
  "Dobbelt-GO-spærre: fra": ["Double-GO lock: off", "Doppel-GO-Sperre: aus", "Anti double GO : désactivé", "Bloqueo doble GO: no", "Dubbel-GO-spärr: av", "Dobbel-GO-sperre: av"],
  "Gem automatisk: Fra": ["Autosave: Off", "Autospeichern: Aus", "Sauvegarde auto : non", "Autoguardado: No", "Autospara: Av", "Autolagring: Av"],
  "Tidsboks: Aktiv spilletid": ["Time box: Active play time", "Zeitfeld: Aktive Spielzeit", "Temps : lecture active", "Tiempo: reproducción activa", "Tidsruta: Aktiv speltid", "Tidsboks: Aktiv spilletid"],
  "Tidsboks: Siden sidste GO": ["Time box: Since last GO", "Zeitfeld: Seit letztem GO", "Temps : depuis le dernier GO", "Tiempo: desde último GO", "Tidsruta: Sedan senaste GO", "Tidsboks: Siden siste GO"],
  "Tidsboks: Kun nedtælling": ["Time box: Countdown only", "Zeitfeld: Nur Countdown", "Temps : compte à rebours", "Tiempo: solo cuenta atrás", "Tidsruta: Endast nedräkning", "Tidsboks: Kun nedtelling"],
  "Tidsformat: Timer:minutter:sekunder": ["Time format: Hours:minutes:seconds", "Zeitformat: Std:Min:Sek", "Format : h:min:s", "Formato: h:min:s", "Tidsformat: tim:min:sek", "Tidsformat: timer:min:sek"],
  "Tidsformat: Kun sekunder": ["Time format: Seconds only", "Zeitformat: Nur Sekunden", "Format : secondes", "Formato: solo segundos", "Tidsformat: Endast sekunder", "Tidsformat: Kun sekunder"],
  "🛡️ Stop Hot-Standby (bliv master)": ["🛡️ Stop hot-standby (become master)", "🛡️ Hot-Standby beenden (Master werden)", "🛡️ Arrêter le secours (devenir maître)", "🛡️ Detener respaldo (ser principal)", "🛡️ Stoppa hot-standby (bli master)", "🛡️ Stopp hot-standby (bli master)"],
  "🛡️ Kør som Hot-Standby backup-PC (Pro)…": ["🛡️ Run as hot-standby backup PC (Pro)…", "🛡️ Als Hot-Standby-Backup-PC (Pro)…", "🛡️ PC de secours à chaud (Pro)…", "🛡️ PC de respaldo en caliente (Pro)…", "🛡️ Kör som hot-standby-backup (Pro)…", "🛡️ Kjør som hot-standby-backup (Pro)…"],
  "💡 Foreslå ændring / fejl": ["💡 Suggest change / report bug", "💡 Änderung vorschlagen / Fehler", "💡 Suggérer / signaler un bug", "💡 Sugerir cambio / error", "💡 Föreslå ändring / fel", "💡 Foreslå endring / feil"],
  "Vilkår": ["Terms", "AGB", "Conditions", "Términos", "Villkor", "Vilkår"],
  "Om StageCue": ["About StageCue", "Über StageCue", "À propos", "Acerca de StageCue", "Om StageCue", "Om StageCue"],
  "Gemmer…": ["Saving…", "Speichert…", "Enregistrement…", "Guardando…", "Sparar…", "Lagrer…"],
  "Ikke gemt!": ["Not saved!", "Nicht gespeichert!", "Non enregistré !", "¡No guardado!", "Inte sparat!", "Ikke lagret!"],
  "✓ Gemt i skyen": ["✓ Saved to cloud", "✓ In der Cloud gespeichert", "✓ Enregistré dans le cloud", "✓ Guardado en la nube", "✓ Sparat i molnet", "✓ Lagret i skyen"],
  "🔒 LÅST TIL LIVE": ["🔒 LOCKED FOR LIVE", "🔒 LIVE GESPERRT", "🔒 VERROUILLÉ LIVE", "🔒 BLOQUEADO EN VIVO", "🔒 LÅST FÖR LIVE", "🔒 LÅST FOR LIVE"],
  "🔓 Lås show": ["🔓 Lock show", "🔓 Show sperren", "🔓 Verrouiller", "🔓 Bloquear show", "🔓 Lås show", "🔓 Lås show"],
  "FREE · Opgrader": ["FREE · Upgrade", "FREE · Upgrade", "FREE · Passer Pro", "FREE · Mejorar", "FREE · Uppgradera", "FREE · Oppgrader"],
  "Genoptag herfra": ["Resume from here", "Hier fortsetzen", "Reprendre ici", "Reanudar aquí", "Fortsätt härifrån", "Fortsett herfra"],
  "Start forfra": ["Start over", "Von vorn", "Recommencer", "Empezar de nuevo", "Börja om", "Start på nytt"],
};
const P: [RegExp, Row][] = [
  [/^Nyt (\w+)-cue$/, ["New $1 cue", "Neuer $1-Cue", "Nouveau cue $1", "Nuevo cue $1", "Nytt $1-cue", "Ny $1-cue"]],
  [/^Dobbelt-GO-spærre: (.+) s$/, ["Double-GO lock: $1 s", "Doppel-GO-Sperre: $1 s", "Anti double GO : $1 s", "Bloqueo doble GO: $1 s", "Dubbel-GO-spärr: $1 s", "Dobbel-GO-sperre: $1 s"]],
  [/^Gem automatisk hver (\d+) min$/, ["Autosave every $1 min", "Alle $1 Min. speichern", "Sauvegarde auto toutes les $1 min", "Autoguardar cada $1 min", "Autospara var $1:e min", "Autolagre hvert $1. min"]],
  [/^PRO-prøve: (\d+) dage$/, ["PRO trial: $1 days", "PRO-Test: $1 Tage", "Essai PRO : $1 jours", "Prueba PRO: $1 días", "PRO-test: $1 dagar", "PRO-prøve: $1 dager"]],
];
const IDX: Record<Exclude<Lang, "da">, number> = { en: 0, de: 1, fr: 2, es: 3, sv: 4, no: 5 };

export function trApp(s: string, lang: Lang): string {
  if (lang === "da") return s;
  const i = IDX[lang];
  const row = D[s];
  if (row) return row[i]!;
  for (const [re, r] of P) if (re.test(s)) return s.replace(re, r[i]!);
  return s;
}

const KEY = "stagecue.lang";
const EVT = "stagecue:lang";
export function setAppLang(l: Lang) { localStorage.setItem(KEY, l); window.dispatchEvent(new Event(EVT)); }
export function useAppLang(): Lang {
  const [lang, setLang] = useState<Lang>("da");
  useEffect(() => {
    const read = () => { const s = localStorage.getItem(KEY) as Lang | null; setLang(s && LANGS.includes(s) ? s : detectLang(navigator.language)); };
    read();
    window.addEventListener(EVT, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(EVT, read); window.removeEventListener("storage", read); };
  }, []);
  return lang;
}
export function useTrApp() { const l = useAppLang(); return (s: string) => trApp(s, l); }
