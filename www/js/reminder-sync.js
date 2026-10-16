// Verbindet Einstellungen und Lernstand mit den Handy-Erinnerungen.

import * as store from './store.js';
import { rescheduleReminders } from './native.js';
import { dayNumber } from './dates.js';
import { currentStreak } from './streak.js';

/** Plant die Erinnerungen neu (z. B. nach dem Lernen: heute nicht mehr erinnern). */
export function refreshReminders() {
  const s = store.get();
  const today = dayNumber();
  const doneToday = !!s.days[today]?.g;
  return rescheduleReminders({
    enabled: s.settings.reminderOn,
    time: s.settings.reminderTime,
    skipToday: s.settings.skipIfDone && doneToday,
    streakCount: currentStreak(s.streak, today).count,
  });
}
