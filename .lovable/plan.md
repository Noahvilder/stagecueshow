# Automatiske opdateringer i Windows-appen

## Hvad der ændres
1. Opdateringsadressen i appen rettes til dit rigtige GitHub-projekt (`Noahvilder/stagecueshow`), så appen kan finde nye versioner.
2. GitHub-bygningen laver også en officiel Release, når du trykker "Run workflow" manuelt. Versionsnummeret tages automatisk fra appen (f.eks. `v0.1.6`), så du ikke selv skal lave tags.

## Sådan udgiver du fremover
- Bed mig hæve versionsnummeret (f.eks. 0.1.7).
- Tryk "Run workflow" på GitHub.
- Når bygningen er færdig, viser alle installerede apps "Ny version" og kan opdatere med ét klik.

Bemærk: Appen du har installeret nu kender den forkerte adresse. Installér den næste version manuelt én gang, derefter går resten automatisk.

## Tekniske detaljer
- `src-tauri/tauri.conf.json`: endpoint → `https://github.com/Noahvilder/stagecueshow/releases/latest/download/latest.json`.
- `release.yml`: læs version fra `tauri.conf.json`, sæt `TAG=v<version>`; brug `TAG` i stedet for `github.ref_name` i latest.json-URL; kør `softprops/action-gh-release` altid med `tag_name: TAG`, `make_latest: true`.
