// Zugriff auf Handy-Funktionen (Capacitor). Alles ist abgesichert:
// Fehlt ein Plugin oder läuft die App nur im Browser, passiert einfach nichts Schlimmes.

import { reminderTimes, parseTime, reminderText } from './reminders.js';
import { dayNumber } from './dates.js';

export function isNative() {
  try {
    return !!window.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

const cache = new Map();

/** Liefert ein Capacitor-Plugin (nur auf dem Handy) oder null. */
export function getPlugin(name) {
  if (!isNative()) return null;
  if (cache.has(name)) return cache.get(name);
  let plugin = null;
  try {
    plugin = window.Capacitor.registerPlugin(name);
  } catch {
    try {
      plugin = window.Capacitor.Plugins?.[name] ?? null;
    } catch {
      plugin = null;
    }
  }
  cache.set(name, plugin);
  return plugin;
}

// ---------- Vorlesen ----------

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** Nur die erste Schreibweise vorlesen: "chat / chatte" -> "chat", Klammern weglassen. */
export function speechText(text) {
  const first = String(text ?? '').split(/\s*[/;|]\s*/)[0];
  return first.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickVoice(lang) {
  try {
    const voices = window.speechSynthesis.getVoices() ?? [];
    const norm = (l) => l.replace('_', '-').toLowerCase();
    const want = norm(lang);
    return (
      voices.find((v) => norm(v.lang) === want) ?? voices.find((v) => norm(v.lang).startsWith(want.slice(0, 2))) ?? null
    );
  } catch {
    return null;
  }
}

/** @returns {boolean} true, wenn Vorlesen gestartet wurde */
export function speak(text, lang) {
  const t = speechText(text);
  if (!t || !lang || !canSpeak()) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang;
    u.rate = 0.9;
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

// ---------- Dateien (Backup) ----------

/** Speichert/teilt eine Textdatei. Am Handy über das Teilen-Menü, im Browser als Download. */
export async function exportTextFile(filename, text) {
  const fs = getPlugin('Filesystem');
  const share = getPlugin('Share');
  if (fs && share) {
    try {
      const res = await fs.writeFile({ path: filename, data: text, directory: 'CACHE', encoding: 'utf8' });
      await share.share({ title: 'LearnApp Backup', dialogTitle: 'Backup speichern', url: res.uri });
      return true;
    } catch (err) {
      if (String(err?.message ?? err).toLowerCase().includes('cancel')) return false;
    }
  }
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    return false;
  }
}

// ---------- Erinnerungen ----------

const CHANNEL_ID = 'reminders';
const ID_BASE = 1000;

export function remindersSupported() {
  return !!getPlugin('LocalNotifications');
}

async function ensurePermission(ln) {
  let perm = await ln.checkPermissions();
  if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
    perm = await ln.requestPermissions();
  }
  return perm.display === 'granted';
}

async function cancelOurs(ln) {
  const pending = await ln.getPending();
  const ours = (pending.notifications ?? []).filter((n) => n.id >= ID_BASE && n.id < ID_BASE + 100);
  if (ours.length) await ln.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
}

/**
 * Plant die Erinnerungen der nächsten 10 Tage neu.
 * @returns {Promise<{ok:boolean, reason?:'unsupported'|'permission'|'error', count?:number}>}
 */
export async function rescheduleReminders({ enabled, time, skipToday, streakCount }) {
  const ln = getPlugin('LocalNotifications');
  if (!ln) return { ok: false, reason: 'unsupported' };
  try {
    await cancelOurs(ln);
    if (!enabled) return { ok: true, count: 0 };
    if (!(await ensurePermission(ln))) return { ok: false, reason: 'permission' };
    try {
      await ln.createChannel({
        id: CHANNEL_ID,
        name: 'Erinnerungen',
        description: 'Tägliche Erinnerung ans Vokabellernen',
        importance: 3,
        visibility: 1,
      });
    } catch {
      /* Kanäle gibt es nur auf Android */
    }
    const { hour, minute } = parseTime(time);
    const times = reminderTimes({ today: dayNumber(), hour, minute, skipToday });
    if (!times.length) return { ok: true, count: 0 };
    const text = reminderText(streakCount);
    await ln.schedule({
      notifications: times.map((at, i) => ({
        id: ID_BASE + i,
        title: text.title,
        body: text.body,
        channelId: CHANNEL_ID,
        schedule: { at, allowWhileIdle: true },
        // Keine exakten Wecker: Dafür bräuchte die App eine Sonderberechtigung, und "ungefähr um 16:30" reicht völlig.
        isExactNotification: false,
      })),
    });
    return { ok: true, count: times.length };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Zeigt in 5 Sekunden eine Test-Erinnerung (zum Ausprobieren in den Einstellungen). */
export async function sendTestReminder() {
  const ln = getPlugin('LocalNotifications');
  if (!ln) return { ok: false, reason: 'unsupported' };
  try {
    if (!(await ensurePermission(ln))) return { ok: false, reason: 'permission' };
    await ln.schedule({
      notifications: [
        {
          id: ID_BASE + 99,
          title: 'Test-Erinnerung',
          body: 'So sieht deine tägliche Erinnerung aus.',
          channelId: CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
          isExactNotification: false,
        },
      ],
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
