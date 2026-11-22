# Download-knap der altid henter nyeste version fra GitHub

## Hvad ændres
- Download-siden spørger GitHub om den nyeste udgivelse (Noahvilder/stagecueshow) og viser selv versionsnummer og filnavn, f.eks. "v0.1.6".
- Knappen peger direkte på installationsfilen (`*_x64-setup.exe`) i den nyeste udgivelse.
- Hvis GitHub ikke svarer, falder knappen tilbage til den nuværende v0.1.5-fil, så siden aldrig er uden download.
- `pad_file.xml` peger på GitHubs "nyeste"-adresse i stedet for en fast fil.
- Gamle installationsfiler i projektet ryddes op (bruges kun som nødløsning).

## Teknisk
- Server-funktion henter `https://api.github.com/repos/Noahvilder/stagecueshow/releases/latest`, finder asset der ender på `-setup.exe`, cacher svaret ~10 min.
- Route-loader kalder den; komponenten viser `tag_name` og `browser_download_url`.
- Kræver at repo er offentligt (det er det nu).

## Fremover
Hæv version → Publish → Run workflow. Hverken app eller hjemmeside kræver flere zip-filer.
