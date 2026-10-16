// Bereitet das von Capacitor erzeugte Android-Projekt vor (läuft nach "npx cap add android"):
//  - Ränder: Die App zeichnet bis unter die Statusleiste (Edge-to-Edge), wie Capacitor 8 es verlangt
//  - Benachrichtigungs-Symbol (ic_stat_vocab) für die Lern-Erinnerung
//  - Berechtigung zum Anzeigen von Benachrichtigungen (Android 13+)
//  - Versionsnummer (versionCode muss bei jedem Play-Upload größer werden)
//
// Aufruf:  node scripts/android-prepare.mjs [--release]
// Umgebungsvariablen:  VERSION_CODE (Zahl), VERSION_NAME (Text)

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const release = process.argv.includes('--release');
const androidDir = join(root, 'android');
const appDir = join(androidDir, 'app');

const say = (msg) => console.log(`• ${msg}`);
function fail(msg) {
  console.error(`\nFEHLER: ${msg}\n`);
  process.exit(1);
}

// ---------- 1. Einstellungen lesen und prüfen ----------

const config = JSON.parse(await readFile(join(root, 'capacitor.config.json'), 'utf8'));
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const appId = String(config.appId ?? '');

if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(appId)) {
  fail(
    `Die App-ID "${appId}" in capacitor.config.json ist ungültig.\n` +
      'Erlaubt sind nur Kleinbuchstaben, Ziffern und Unterstriche, getrennt durch Punkte, zum Beispiel: io.github.meinname.vokabeltrainer',
  );
}
const PLACEHOLDER_ID = 'app.learnapp.vokabeln';
if (release && appId === PLACEHOLDER_ID && !process.env.ALLOW_PLACEHOLDER_APPID) {
  fail(
    `Du baust eine Release-Version, aber die App-ID ist noch der Platzhalter "${PLACEHOLDER_ID}".\n` +
      'Die App-ID kann nach dem ersten Upload bei Google Play NIE mehr geändert werden. Ändere sie jetzt in capacitor.config.json\n' +
      '(Zeile "appId"), zum Beispiel auf io.github.DEIN-GITHUB-NAME.vokabeltrainer, und starte den Build neu.',
  );
}
if (!existsSync(appDir)) {
  fail('Der Ordner android/ fehlt. Führe zuerst "npx cap add android" aus.');
}

const versionCode = Number.parseInt(process.env.VERSION_CODE ?? '1', 10);
const versionName = process.env.VERSION_NAME || pkg.version || '1.0.0';
if (!Number.isInteger(versionCode) || versionCode < 1 || versionCode > 2100000000) {
  fail(`VERSION_CODE "${process.env.VERSION_CODE}" ist keine gültige Zahl.`);
}

// ---------- 2. MainActivity: Edge-to-Edge einschalten ----------

async function findFile(dir, name) {
  if (!existsSync(dir)) return null;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = await findFile(p, name);
      if (hit) return hit;
    } else if (entry.name === name) return p;
  }
  return null;
}

const mainActivity = await findFile(join(appDir, 'src', 'main', 'java'), 'MainActivity.java');
if (!mainActivity) {
  say('MainActivity.java nicht gefunden – übersprungen (die App läuft trotzdem, nur die Ränder können abweichen).');
} else {
  let src = await readFile(mainActivity, 'utf8');
  if (src.includes('EdgeToEdge')) {
    say('MainActivity: Edge-to-Edge ist schon eingebaut.');
  } else if (/public class MainActivity extends BridgeActivity\s*\{\s*\}/.test(src)) {
    src = src.replace(
      /public class MainActivity extends BridgeActivity\s*\{\s*\}/,
      [
        'public class MainActivity extends BridgeActivity {',
        '    @Override',
        '    public void onCreate(Bundle savedInstanceState) {',
        '        EdgeToEdge.enable(this);',
        '        super.onCreate(savedInstanceState);',
        '    }',
        '}',
      ].join('\n'),
    );
    src = src.replace(/(package [^;]+;\s*)/, '$1\nimport android.os.Bundle;\nimport androidx.activity.EdgeToEdge;\n');
    await writeFile(mainActivity, src);
    say('MainActivity: Edge-to-Edge eingebaut.');
  } else {
    say('MainActivity hat eine unerwartete Form – nicht verändert.');
  }
}

// ---------- 3. Benachrichtigungs-Symbol ----------

const drawableDir = join(appDir, 'src', 'main', 'res', 'drawable');
await mkdir(drawableDir, { recursive: true });
await writeFile(
  join(drawableDir, 'ic_stat_vocab.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<!-- Weißes Symbol für die Statusleiste: Karteikarte mit Häkchen -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:fillType="evenOdd"
        android:pathData="M5,3h14a2,2 0 0 1 2,2v14a2,2 0 0 1 -2,2H5a2,2 0 0 1 -2,-2V5a2,2 0 0 1 2,-2z M10.2,16.6l-3.4,-3.4 1.4,-1.4 2,2 5.4,-5.4 1.4,1.4z" />
</vector>
`,
);
say('Benachrichtigungs-Symbol angelegt.');

// ---------- 4. Manifest: Erlaubnis für Benachrichtigungen ----------

const manifestPath = join(appDir, 'src', 'main', 'AndroidManifest.xml');
if (existsSync(manifestPath)) {
  let manifest = await readFile(manifestPath, 'utf8');
  if (!manifest.includes('android.permission.POST_NOTIFICATIONS')) {
    manifest = manifest.replace(
      '</manifest>',
      '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n</manifest>',
    );
    await writeFile(manifestPath, manifest);
    say('Manifest: Berechtigung POST_NOTIFICATIONS ergänzt.');
  } else {
    say('Manifest: POST_NOTIFICATIONS ist schon vorhanden.');
  }
} else {
  say('AndroidManifest.xml nicht gefunden – übersprungen.');
}

// ---------- 5. Versionsnummer ----------

const gradlePath = join(appDir, 'build.gradle');
if (!existsSync(gradlePath)) {
  if (release) fail('android/app/build.gradle fehlt – Versionsnummer kann nicht gesetzt werden.');
  say('build.gradle nicht gefunden – Versionsnummer übersprungen.');
} else {
  let gradle = await readFile(gradlePath, 'utf8');
  const codeRe = /versionCode\s+\d+/;
  const nameRe = /versionName\s+"[^"]*"/;
  if (!codeRe.test(gradle) || !nameRe.test(gradle)) {
    if (release) fail('In android/app/build.gradle wurden versionCode/versionName nicht gefunden. Das Capacitor-Template hat sich vermutlich geändert.');
    say('versionCode/versionName nicht gefunden – übersprungen.');
  } else {
    gradle = gradle.replace(codeRe, `versionCode ${versionCode}`).replace(nameRe, `versionName "${versionName}"`);
    await writeFile(gradlePath, gradle);
    say(`Version gesetzt: ${versionName} (Code ${versionCode}).`);
  }
}

console.log(`\nFertig. App-ID: ${appId}${release ? ' (Release)' : ''}`);
