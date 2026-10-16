# LearnApp: Anleitung vom Code bis in den Play Store

Diese Anleitung ist für Anfänger geschrieben. Du brauchst **keine** Programme auf dem Computer zu installieren. Alles läuft über GitHub im Browser. Lies zuerst den Überblick, dann arbeitest du die Teile der Reihe nach ab.

---

## Überblick: Was ist das hier?

LearnApp ist ein Vokabeltrainer für Android. Du bekommst:

- die fertige App als Programmcode (Ordner `www/`),
- die Technik, die daraus eine echte Android-App macht (Capacitor, automatisch auf GitHub),
- Icons, Startbild, Datenschutzerklärung,
- Material für den Play Store (Ordner `Store-Material/` neben dem Projektordner).

**So kommt die App auf dein Handy und in den Store:**

1. Du lädst die Dateien in ein GitHub-Projekt hoch (Teil A).
2. GitHub zeigt dir die App als Web-Seite zum Ausprobieren (Teil B).
3. GitHub baut dir automatisch eine Android-Datei (APK) zum Testen auf deinem Handy (Teil C).
4. Du legst ein Google-Play-Konto an und bereitest den Store-Eintrag vor (Teil D, E).
5. GitHub baut die signierte Datei für den Store (Teil F), du lädst sie bei Google hoch (Teil G, H).

**Zwei ehrliche Hinweise vorweg:**

- Die App selbst habe ich im Browser auf Handygröße durchgetestet (Lernen, Tippen, Handschrift, Klassenarbeit, Probetest, Backup, Zurück-Taste, 64 automatische Tests). Den **Android-Bau** auf GitHub und die **Handy-Funktionen** (Erinnerung, Teilen-Menü, Statusleiste) konnte ich hier nicht ausprobieren, weil es dafür ein echtes Android-Gerät und das Android-SDK braucht. Möglicherweise wird der erste Lauf auf GitHub rot. Das ist normal und meistens schnell behoben: Kopiere dann die Fehlermeldung und schick sie mir (siehe Teil I).
- Google ändert Regeln und Oberflächen gelegentlich. Wo die Play Console anders aussieht als hier beschrieben, hilft es, den Namen des Punktes zu suchen. Die wichtigsten Regeln habe ich im Oktober 2026 bei Google nachgelesen (siehe Quellen am Ende).

---

## Teil A: Dateien auf GitHub hochladen

### A1. Konto und Projekt anlegen

1. Gehe auf <https://github.com> und melde dich an (oder lege ein kostenloses Konto an). Merke dir deinen **Benutzernamen**.
2. Klicke oben rechts auf **+** und dann auf **New repository**.
3. Bei **Repository name** schreibst du `vokabeltrainer` (Kleinbuchstaben, keine Leerzeichen).
4. Wähle **Public**. Das ist nötig, damit die Web-Vorschau (GitHub Pages) im kostenlosen Konto funktioniert. Im Code steht nichts Geheimes. Dein Schlüssel für den Play Store kommt später in einen geschützten Bereich und **nie** in die Dateien.
5. Setze **keinen** Haken bei „Add a README“. Klicke auf **Create repository**.

### A2. Dateien hochladen

1. Entpacke die ZIP-Datei, die du von mir bekommen hast. Du siehst zwei Ordner: `LearnApp` (das Projekt) und `Store-Material`.
2. Öffne die Seite deines neuen GitHub-Projekts und klicke auf den Link **uploading an existing file**.
3. Öffne den Ordner `LearnApp` auf deinem Computer, markiere **alles darin** (`Strg + A`) und ziehe es in das Browserfenster.
   - **Wichtig:** Es muss auch der Ordner `.github` dabei sein. Er beginnt mit einem Punkt. Auf dem Mac ist er in Finder meist unsichtbar: Drücke `Cmd + Shift + .` (Punkt), dann siehst du ihn. Ohne diesen Ordner baut GitHub nichts.
   - Ziehe nicht den Ordner `LearnApp` selbst hinein, sondern **den Inhalt**. Auf der GitHub-Seite müssen danach `www`, `test`, `package.json` und so weiter direkt in der obersten Ebene stehen.
4. Warte, bis alle Dateien hochgeladen sind. Unten klickst du auf **Commit changes**.

> Falls GitHub bei vielen Dateien Probleme macht, lade zuerst einen Teil hoch und danach den Rest. Das Hochladen ist mehrmals möglich.

### A3. Kontrolle

Auf der Startseite deines Projekts musst du jetzt unter anderem sehen: `.github`, `assets`, `scripts`, `test`, `www`, `ANLEITUNG.md`, `capacitor.config.json`, `package.json`. Klicke auf `.github` und dann auf `workflows`: Dort müssen `android.yml` und `pages.yml` liegen.

---

## Teil B: Die App im Browser ausprobieren (GitHub Pages)

1. In deinem Projekt: **Settings** (Zahnrad-Reiter oben) → links **Pages**.
2. Bei **Build and deployment → Source** wählst du **GitHub Actions**.
3. Klicke oben auf den Reiter **Actions**. Dort läuft schon (oder du startest ihn) der Eintrag **Web-Vorschau (GitHub Pages)**. Klicke links darauf, dann rechts auf **Run workflow → Run workflow**.
4. Nach etwa einer Minute ist der Lauf grün (✓). Deine App ist jetzt hier erreichbar:

   `https://DEIN-BENUTZERNAME.github.io/vokabeltrainer/`

5. Öffne den Link am Handy. Du kannst die App ausprobieren. Im Browser funktionieren Erinnerungen **nicht**, alles andere schon.

**Schneller Test ohne GitHub:** Die Datei `vokabeltrainer-vorschau.html` (liegt neben der ZIP) ist die ganze App in einer einzigen Datei. Doppelklick auf dem Computer, und sie öffnet sich im Browser.

**Wenn etwas rot wird:** Siehe Teil I.

---

## Teil C: Test-App (APK) auf dein Handy

Bei jedem Hochladen baut GitHub automatisch eine Test-APK. Das dauert etwa 5 bis 10 Minuten.

1. Reiter **Actions** → in der Liste links **Android-App bauen** → klicke auf den obersten Lauf.
2. Ist der Lauf grün, scrolle ganz nach unten zu **Artifacts** und lade **LearnApp-Test-APK** herunter. Das ist eine ZIP-Datei. Entpacke sie, darin liegt `app-debug.apk`.
3. Bring die Datei aufs Handy (per USB-Kabel, Google Drive oder E-Mail an dich selbst) und tippe sie an.
4. Android fragt, ob du Apps aus dieser Quelle installieren darfst. Erlaube es nur für diese Installation. Falls Google Play Protect warnt, weil die App unbekannt ist: **Trotzdem installieren** (die App ist ja deine).

### Das solltest du am Handy testen

- [ ] Sprache anlegen, Ordner anlegen, Liste einfügen, eine Runde lernen.
- [ ] **Statusleiste und Ränder:** Ragt nichts unter die Uhr oder die Navigationsleiste?
- [ ] **Zurück-Taste:** Schließt zuerst Pop-ups, geht dann eine Seite zurück, und beendet die App nur auf der Startseite.
- [ ] **Vorlesen** (Lautsprecher-Symbol). Für manche Sprachen (Latein) gibt es keine Stimme, das ist normal.
- [ ] **Handschrift** mit dem Finger.
- [ ] **Erinnerung:** Mehr → Tägliche Erinnerung einschalten, Benachrichtigungen erlauben, dann auf **Test-Erinnerung in 5 Sekunden** tippen.
- [ ] **Backup speichern** (Teilen-Menü erscheint) und **Backup laden**.
- [ ] App schließen und wieder öffnen: Sind die Vokabeln noch da?

Schreib mir, was nicht klappt, am besten mit Handy-Modell und Android-Version.

---

## Teil D: Google-Play-Konto anlegen

1. Gehe auf <https://play.google.com/console> und melde dich mit deinem Google-Konto an.
2. Wähle **Privatperson (Personal)**.
3. Du zahlst **einmalig 25 US-Dollar** per Kredit- oder Debitkarte (keine Prepaid-Karte).
4. Google prüft deine Identität (Ausweis, Name wie im Ausweis). Außerdem musst du mit der **Play-Console-App** auf einem Android-Handy bestätigen, dass du ein Android-Gerät hast.
5. Ein Play-Entwicklerkonto darf nur anlegen, wer volljährig ist. Bist du noch nicht 18, lege es gemeinsam mit einem Elternteil an, auf dessen Namen es dann läuft.

**Wichtige Regel für neue Privatkonten (seit 13.11.2023):** Bevor du die App für alle veröffentlichen darfst, musst du sie in einem **geschlossenen Test** mit mindestens **12 Testern** testen. Alle 12 müssen **14 Tage lang am Stück** angemeldet sein. Danach beantragst du den „Produktionszugriff“. Plane also mindestens drei Wochen bis zur Veröffentlichung ein. Mehr dazu in Teil G.

---

## Teil E: App-ID und Name festlegen (bitte vor dem ersten Upload!)

Jede Android-App hat eine **App-ID**, zum Beispiel `io.github.maxmuster.vokabeltrainer`. Sie muss auf der ganzen Welt einmalig sein und lässt sich nach dem ersten Upload bei Google **nie wieder ändern**.

1. Öffne in deinem GitHub-Projekt die Datei `capacitor.config.json` und klicke auf den Stift (Edit).
2. Ändere die Zeile `"appId": "app.learnapp.vokabeln"` in:

   `"appId": "io.github.DEIN-BENUTZERNAME.vokabeltrainer"`

   Nur Kleinbuchstaben, Ziffern und Punkte. Keine Bindestriche, kein Leerzeichen. Hat dein Benutzername Bindestriche, lass sie weg.
3. Der angezeigte App-Name steht in `"appName": "LearnApp"`. Du kannst ihn ändern, bevor du die App einstellst.
4. **Commit changes**.

> Der Release-Bau auf GitHub bricht absichtlich ab, solange noch die Platzhalter-ID steht. Das schützt dich vor einem Fehler, den man nicht mehr korrigieren kann.

### Datenschutzerklärung ausfüllen

1. Öffne `www/datenschutz.html`, klicke auf den Stift.
2. Ersetze `[DEIN VOLLER NAME]` und `[DEINE E-MAIL-ADRESSE]` durch deine Angaben. Die Adresse wird öffentlich sichtbar sein, nimm eine, die du dafür nutzen möchtest.
3. **Commit changes** und warte, bis die Web-Vorschau (Teil B) neu gelaufen ist. Dann ist die Erklärung erreichbar unter:

   `https://DEIN-BENUTZERNAME.github.io/vokabeltrainer/datenschutz.html`

   Diesen Link brauchst du für die Play Console.

---

## Teil F: Signatur-Schlüssel erzeugen und die Store-Datei bauen

Google verlangt, dass die Datei, die du hochlädst, mit einem Schlüssel signiert ist. Diesen Schlüssel erzeugst du einmal selbst. Du brauchst dafür keinen Computer mit Programmen: GitHub bietet einen Computer im Browser an (Codespaces).

### F1. Schlüssel erzeugen

1. In deinem Projekt: grüner Knopf **Code** → Reiter **Codespaces** → **Create codespace on main**. Warte, bis unten ein Fenster mit Eingabezeile („Terminal“) erscheint.
2. Tippe in das Terminal diese Zeile und bestätige mit Enter:

   ```
   keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```

3. Du wirst nach einem **Passwort** gefragt. Wähle ein langes Passwort und **schreib es auf**. Beim zweiten Mal gleich wiederholen. Bei „Vor- und Nachname“ und den weiteren Fragen kannst du Name und Land angeben oder jeweils Enter drücken. Am Ende bestätigst du mit `ja` (oder `yes`). Fragt er „Schlüsselkennwort … (RETURN, wenn identisch mit Keystore-Kennwort)“, drückst du einfach Enter.
4. Tippe nun:

   ```
   base64 -w0 upload.jks
   ```

   Es erscheint eine sehr lange Zeichenfolge. **Markiere sie komplett** und kopiere sie (Rechtsklick → Copy).

### F2. Die drei Geheimnisse bei GitHub eintragen

1. In deinem Projekt: **Settings → Secrets and variables → Actions → New repository secret**.
2. Lege diese drei Einträge an (Name genau so schreiben, Großbuchstaben):

   | Name | Inhalt |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | die lange Zeichenfolge aus Schritt 4 |
   | `ANDROID_KEYSTORE_PASSWORD` | dein Passwort |
   | `ANDROID_KEY_ALIAS` | `upload` |

### F3. Schlüssel-Datei sichern

1. Im Codespace links in der Dateiliste: Rechtsklick auf `upload.jks` → **Download**. Speichere die Datei zusammen mit dem Passwort an einem sicheren Ort (zum Beispiel Passwort-Manager und USB-Stick).
2. Lösche danach den Codespace (Reiter Codespaces auf github.com/codespaces → **…** → **Delete**), damit nichts herumliegt.

> `upload.jks` darf nie in dein Projekt hochgeladen werden. Das Projekt ist so eingestellt, dass solche Dateien ignoriert werden. Verlierst du den Schlüssel, kannst du bei Google einen neuen Upload-Schlüssel beantragen. Das geht, ist aber lästig.

### F4. Store-Datei bauen

1. Reiter **Actions** → links **Android-App bauen** → rechts **Run workflow**.
2. Bei **Was soll gebaut werden?** wähle **play-store-aab** und starte den Lauf.
3. Nach 5 bis 10 Minuten ist der Lauf grün. Unten bei **Artifacts** lädst du **LearnApp-Play-Store-AAB** herunter, entpackst die ZIP und hast die Datei `learnapp-release.aab`. Diese lädst du später bei Google hoch.

---

## Teil G: App in der Play Console anlegen und testen

### G1. App erstellen

1. In der Play Console: **App erstellen**. Name: `LearnApp – Vokabeltrainer`, Sprache: Deutsch, **App** (nicht Spiel), **Kostenlos**. Haken bei den Erklärungen setzen.

### G2. Store-Eintrag und Fragebögen ausfüllen

Auf der Startseite der App führt dich die Play Console durch eine Liste „Einrichtung“. Alle Texte und alle Antworten findest du fertig in `Store-Material/Store-Texte.md`. Dort liegen auch die Bilder: Symbol (512 × 512), Feature-Grafik (1024 × 500) und fünf Screenshots.

Die wichtigsten Punkte:

- **Datenschutzerklärung:** Link aus Teil E.
- **Werbung:** Nein.
- **Zielgruppe und Inhalte:** Altersgruppen **9–12, 13–15, 16–17, 18+**. Weil auch Kinder zur Zielgruppe gehören, gelten Googles Regeln für Familien-Apps. Die App erfüllt sie, weil sie keine Werbung zeigt und keine Daten sammelt.
- **Datensicherheit:** „Es werden keine Daten erhoben oder weitergegeben.“
- **Inhaltsbewertung:** Fragebogen ehrlich ausfüllen, alles „Nein“.

### G3. Geschlossenen Test starten

1. Menü links: **Testen → Geschlossener Test → Test erstellen** (Track „Closed testing“).
2. Unter **Tester** legst du eine **E-Mail-Liste** an und trägst mindestens 12, besser **15 bis 20** E-Mail-Adressen von Google-Konten ein: Familie, Freunde, Mitschüler. Mehr ist sicherer, weil mancher aussteigt.
3. **Neue Version erstellen:** lade `learnapp-release.aab` hoch, trage die Release-Notes ein und starte die Prüfung durch Google (das kann einige Tage dauern).
4. Kopiere den **Opt-in-Link** und schicke ihn an deine Tester. Jeder muss:
   - den Link auf einem Handy oder im Browser mit **seinem Google-Konto** öffnen,
   - auf **Tester werden** tippen,
   - die App über den Link im Play Store installieren,
   - **14 Tage lang angemeldet bleiben.**

   Es muss nicht jeder jeden Tag die App öffnen. Wichtig ist, dass keiner den Test zwischendurch verlässt und alle 12 gleichzeitig 14 Tage am Stück dabei sind.
5. Wenn alles läuft, gib in der Zwischenzeit Rückmeldungen an mich, falls Testende Fehler finden.

### G4. Produktionszugriff beantragen

Nach 14 Tagen erscheint auf der Startseite der Play Console der Knopf **Produktionszugriff beantragen** („Apply for production“). Du beantwortest drei kurze Fragebögen zum Test, zur App und zur Produktionsreife. Google prüft das normalerweise innerhalb von etwa sieben Tagen.

---

## Teil H: Veröffentlichen

1. Menü **Produktion → Neue Version erstellen**.
2. Lade dieselbe `.aab` hoch (oder eine neuere, siehe Teil J), trage Release-Notes ein.
3. **Prüfen** → **Einführung starten**. Google prüft die App meist ein bis drei Tage, beim ersten Mal manchmal länger.
4. Wenn die App online ist, bekommst du eine E-Mail und den Link zum Store-Eintrag.

---

## Teil I: Wenn etwas nicht klappt

### Der Lauf auf GitHub ist rot (✗)

1. Reiter **Actions** → klicke auf den roten Lauf → klicke auf den Schritt mit dem roten ✗.
2. Kopiere die letzten 30 bis 40 Zeilen der Meldung und schick sie mir. Die häufigsten Fälle:

| Meldung | Bedeutung |
| --- | --- |
| `Es fehlen Geheimnisse …` | Teil F2 nicht (vollständig) erledigt. |
| `App-ID … ungültig` oder `noch der Platzhalter` | Teil E erledigen. |
| `Get Pages site failed` oder Fehler bei `configure-pages` | In Settings → Pages bei Source „GitHub Actions“ wählen (Teil B). |
| Fehler bei `Android-Projekt anlegen`/`cap sync` | Mir die Meldung schicken, hier kann eine Capacitor-Version Anpassungen brauchen. |
| Nichts passiert nach dem Hochladen | Prüfe, ob `.github/workflows/...` auf GitHub vorhanden ist (Teil A3). |

### Die App stürzt am Handy ab oder sieht komisch aus

Schick mir Handy-Modell, Android-Version und ein Foto vom Bildschirm. Im Browser siehst du dieselbe Oberfläche. Ein Vergleich mit der Web-Vorschau hilft.

---

## Teil J: Eine neue Version veröffentlichen

1. Ändere etwas im Projekt und lade es hoch (Commit).
2. Baue die Store-Datei neu (Teil F4). Die Versionsnummer erhöht sich **automatisch** mit jedem Lauf. Google verlangt eine höhere Nummer bei jedem Upload.
3. Lade die neue `.aab` in der Play Console bei **Produktion → Neue Version erstellen** hoch.

---

## Was die App kann (Kurzfassung)

- **Lernen:** Karteikarte, Tippen (fehlertolerant mit Hinweis „fast richtig“), Handschrift (Selbstbewertung). Im Auto-Modus wechselt die App passend, du kannst jederzeit umschalten.
- **Wiederholung nach Plan (FSRS):** Die App berechnet für jede Vokabel, wann du sie fast vergessen hättest, und fragt sie genau dann ab. Falsche Karten kommen in derselben Runde noch einmal.
- **Ordnung:** Beliebige Sprachen, eigene Ordner, Liste einfügen (Tab, „ - “, Semikolon …), doppelte Wortpaare werden einmal abgefragt.
- **Klassenarbeit:** Datum, Ordner, „Bereit zu x %“, Plan „neue Vokabeln pro Tag“, Probetest mit Note.
- **Dranbleiben:** Tagesziel, Serie mit einer Schonfrist pro Woche, Erinnerung zu einer Uhrzeit, die du wählst.
- **Daten:** nur auf dem Gerät, Backup als Datei, Löschen jederzeit.

### Was bewusst noch fehlt

- **Foto-Scan** von Vokabellisten (kommt als Version 2).
- Dunkelmodus, Synchronisation zwischen mehreren Geräten.
- Erinnerungen kommen „ungefähr“ zur eingestellten Zeit (Android darf sie leicht verschieben). Sie werden für die nächsten 10 Tage geplant und bei jedem App-Start erneuert. Wer die App länger als 10 Tage nicht öffnet, bekommt keine weiteren Erinnerungen.

### Kleine Anpassungen, die du selbst machen kannst

| Was | Wo |
| --- | --- |
| Hauptfarbe (Tintenblau) | `www/css/app.css`, ganz oben die Zeile `--blue: #20408f;` |
| Standard-Tagesziel / neue Wörter pro Tag | `www/js/store.js`, Block `defaults()` |
| Texte in der App | die Dateien in `www/js/views/` (alle Texte stehen im Klartext) |
| Notenschlüssel | `www/js/testprep.js`, `GRADE_SCALE` |
| Icon | `assets/*.svg` ändern und die PNG-Dateien daneben ersetzen |

---

## Quellen (Stand: Oktober 2026)

- Google Play Console Hilfe: [Testanforderungen für neue Privatkonten](https://support.google.com/googleplay/android-developer/answer/14151465) (12 Tester, 14 Tage)
- Google Play Console Hilfe: [Entwicklerkonto erstellen](https://support.google.com/googleplay/android-developer/answer/6112435) (25 US-Dollar einmalig, Identitätsprüfung)
- Android Developers: [Anforderungen an die Ziel-API-Stufe](https://developer.android.com/google/play/requirements/target-sdk) (ab 31.08.2026 Android 16 / API 36, die App zielt auf 36)
- Google Play Console Hilfe: [Zielgruppe und Inhalte, Familienrichtlinie](https://support.google.com/googleplay/android-developer/answer/9893335)
- Capacitor: [Local Notifications](https://capacitorjs.com/docs/apis/local-notifications), [System Bars](https://capacitorjs.com/docs/apis/system-bars), [Share](https://capacitorjs.com/docs/apis/share)
