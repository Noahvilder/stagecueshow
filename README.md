# Stagecueshow

Jeg vil gerne lave et Cue/Show Control system til live koncerter, der kan køre stabilt uden crashes og hurtigt på Windows (som en webapp/PWA der bruger Web MIDI API).

Det skal have alle de basale funktioner fra Multiplay, men med en meget renere og mere logisk opbygning:
1. Cue-typer:
   - Lyd-cues: Afspilning af lydfiler/backing tracks med volumen, pan, fade-in og fade-out.
   - MIDI-cues: Skal kunne sende MIDI-signaler til to (eller flere) forskellige enheder i det samme cue (f.eks. Port 1 til MyDMX 5.0 for lys og Port 2 til Mixing Station for mixer-styring, med Note On/Off, Control Change og Program Change).
   - Fade / Stop / Pause cues.
   - Wait / Delay cues.
   - Tekst / Memo cues (noter til sange).

2. Afvikling og triggers (meget simplere end Multiplay):
   - Kæmpe GO-knap (Spacebar) og Standby/Aktiv cue-indikator.
   - Simple afviklingsregler: Manuel (venter på GO) eller Auto-follow (efter pre-wait eller når forrige cue slutter).
   - Tidsstyring (elapsed time, remaining time, countdown).
   - Panic / Stop All knap med valgfri nød-fade.

3. Show og Setliste-styring:
   - Gruppering i Sange / Sæt.
   - Træk og slip (drag & drop) for rækkefølge.
   - Gem og indlæs show-filer (JSON).
   - Høj-kontrast mørkt design optimeret til scenelys og hurtigt overblik.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://stagecueshow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f2af6286-84ac-49fd-8b01-b2201732dea8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
