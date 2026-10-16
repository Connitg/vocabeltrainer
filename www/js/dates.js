// Tage werden als ganze Zahlen gespeichert ("Tag 20376" = ein Kalendertag in der Ortszeit).
// So gibt es keine Probleme mit Uhrzeiten, Zeitzonen oder Sommerzeit.

export const DAY_MS = 86400000;
const pad = (n) => String(n).padStart(2, '0');

/** Heutiger Tag (oder der Tag von `date`) als ganze Zahl in Ortszeit. */
export function dayNumber(date = new Date()) {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / DAY_MS);
}

function utcDate(n) {
  return new Date(n * DAY_MS);
}

/** '2026-10-14' */
export function isoDate(n) {
  return utcDate(n).toISOString().slice(0, 10);
}

/** '2026-10-14' -> Tageszahl */
export function dayFromIso(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** '14.10.2026' */
export function formatDate(n) {
  const d = utcDate(n);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

/** '14.10.' */
export function formatShort(n) {
  const d = utcDate(n);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.`;
}

/** Wochennummer, Woche beginnt am Montag. */
export function weekId(n) {
  return Math.floor((n + 3) / 7);
}

/** Montag = 0 ... Sonntag = 6 */
export function weekdayIndex(n) {
  return (((n % 7) + 7) % 7 + 3) % 7;
}

export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Echtes Date-Objekt für Tag n um hour:minute Ortszeit (für Erinnerungen). */
export function localDateAt(n, hour, minute) {
  const d = utcDate(n);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, minute, 0, 0);
}

/** 'heute', 'morgen', 'in 4 Tagen', 'vor 2 Tagen' */
export function relativeDays(target, today) {
  const diff = target - today;
  if (diff === 0) return 'heute';
  if (diff === 1) return 'morgen';
  if (diff === -1) return 'gestern';
  if (diff > 1) return `in ${diff} Tagen`;
  return `vor ${-diff} Tagen`;
}
