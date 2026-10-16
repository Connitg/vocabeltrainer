// Streak = Anzahl aufeinanderfolgender Tage, an denen das Tagesziel erreicht wurde.
// Schonfrist: Ein verpasster Tag pro Woche (Mo–So) zerstört die Serie nicht.

import { weekId } from './dates.js';

export const EMPTY_STREAK = Object.freeze({ count: 0, lastDay: null, freezeWeek: null });

function freezeAvailable(streak, missedDay) {
  return streak.freezeWeek !== weekId(missedDay);
}

/**
 * Wie viele Tage steht die Serie heute?
 * @returns {{count:number, doneToday:boolean, atRisk:boolean, usesFreeze:boolean}}
 */
export function currentStreak(streak, today) {
  const s = streak ?? EMPTY_STREAK;
  if (s.lastDay == null || !s.count) return { count: 0, doneToday: false, atRisk: false, usesFreeze: false };
  const gap = today - s.lastDay;
  if (gap <= 0) return { count: s.count, doneToday: true, atRisk: false, usesFreeze: false };
  if (gap === 1) return { count: s.count, doneToday: false, atRisk: true, usesFreeze: false };
  if (gap === 2 && freezeAvailable(s, today - 1)) {
    return { count: s.count, doneToday: false, atRisk: true, usesFreeze: true };
  }
  return { count: 0, doneToday: false, atRisk: false, usesFreeze: false };
}

/** Wird aufgerufen, sobald heute das Tagesziel erreicht ist. Gibt den neuen Streak zurück. */
export function recordGoalMet(streak, today) {
  const s = streak ?? EMPTY_STREAK;
  if (s.lastDay === today) return { ...s };
  if (s.lastDay == null) return { count: 1, lastDay: today, freezeWeek: s.freezeWeek ?? null };
  const gap = today - s.lastDay;
  if (gap === 1) return { ...s, count: s.count + 1, lastDay: today };
  if (gap === 2 && freezeAvailable(s, today - 1)) {
    return { count: s.count + 1, lastDay: today, freezeWeek: weekId(today - 1) };
  }
  return { count: 1, lastDay: today, freezeWeek: s.freezeWeek ?? null };
}
