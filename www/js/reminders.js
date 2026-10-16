// Berechnet, wann Erinnerungen geplant werden (reine Logik, ohne Android-Zugriff).

import { localDateAt } from './dates.js';

/**
 * @param {{now?:Date, today:number, hour:number, minute:number, skipToday?:boolean, days?:number}} o
 * @returns {Date[]} Zeitpunkte in der Zukunft, einer pro Tag
 */
export function reminderTimes({ now = new Date(), today, hour, minute, skipToday = false, days = 10 }) {
  const out = [];
  for (let i = 0; i < days; i++) {
    if (i === 0 && skipToday) continue;
    const at = localDateAt(today + i, hour, minute);
    if (at.getTime() <= now.getTime() + 30000) continue;
    out.push(at);
  }
  return out;
}

export function parseTime(str, fallback = { hour: 16, minute: 30 }) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str ?? ''));
  if (!m) return fallback;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return fallback;
  return { hour, minute };
}

export function reminderText(streakCount) {
  if (streakCount >= 2) {
    return { title: `${streakCount} Tage in Folge`, body: 'Deine Serie wartet. Ein paar Vokabeln reichen!' };
  }
  return { title: 'Zeit für Vokabeln', body: 'Ein paar Minuten reichen. Deine fälligen Karten warten.' };
}
