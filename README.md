# LearnApp – Vokabeltrainer

Vokabeltrainer für Android (Schüler ab ca. 10 Jahren): Karteikarte, Tippen, Handschrift, Wiederholung nach FSRS, eigene Sprachen und Ordner, Klassenarbeits-Modus mit Probetest und Note, Serie und Erinnerung. Ohne Konto, ohne Werbung, alle Daten nur auf dem Gerät.

**Schritt-für-Schritt-Anleitung für Anfänger: [ANLEITUNG.md](ANLEITUNG.md)**

## Aufbau

| Ordner / Datei | Inhalt |
| --- | --- |
| `www/` | Die App selbst (HTML, CSS, JavaScript ohne Fremdbibliotheken). `www/index.html` ist der Einstieg. |
| `www/js/` | Lern-Logik (`fsrs.js`, `session.js`, `matching.js`, `streak.js`, `testprep.js`), Daten (`store.js`, `storage.js`) und Handy-Anbindung (`native.js`). |
| `www/js/views/` | Die Bildschirme (Heute, Vokabeln, Tests, Mehr, Lernen). |
| `www/datenschutz.html` | Datenschutzerklärung (Name und E-Mail vor dem Veröffentlichen eintragen). |
| `assets/` | Quellen für App-Icon und Startbild. |
| `scripts/` | `serve.mjs` (lokaler Server), `android-prepare.mjs` (bereitet das Android-Projekt vor). |
| `test/` | 64 automatische Tests der Lern-Logik. |
| `.github/workflows/` | `pages.yml` (Web-Vorschau), `android.yml` (Test-APK und signierte AAB für den Play Store). |
| `capacitor.config.json` | App-ID, App-Name und Einstellungen der Handy-Hülle (Capacitor). |

## Befehle (nur nötig, wenn du auf dem eigenen Computer arbeitest)

Voraussetzung: Node.js 22 oder neuer.

```
npm install        # Pakete laden
npm test           # Tests der Lern-Logik
npm run serve      # App im Browser: http://localhost:8080
```

Die Android-App wird in GitHub Actions gebaut (siehe Anleitung). Der Ordner `android/` wird dort erzeugt und gehört nicht ins Projekt.

## Vor dem ersten Play-Store-Upload

1. `capacitor.config.json`: `appId` ändern (später nicht mehr änderbar).
2. `www/datenschutz.html`: Name und E-Mail eintragen.
3. Drei Secrets für den Signatur-Schlüssel bei GitHub anlegen (Anleitung, Teil F).
