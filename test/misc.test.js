import test from 'node:test';
import assert from 'node:assert/strict';
import { dayNumber, dayFromIso, isoDate, formatDate, weekId, weekdayIndex, localDateAt, relativeDays } from '../www/js/dates.js';
import { currentStreak, recordGoalMet, EMPTY_STREAK } from '../www/js/streak.js';
import { readiness, newPerDay, gradeFor } from '../www/js/testprep.js';
import { reminderTimes, parseTime, reminderText } from '../www/js/reminders.js';
import { review, RATING } from '../www/js/fsrs.js';

// ---------- Datum ----------
test('Tageszahlen und Formatierung', () => {
  const d = dayFromIso('2026-10-14');
  assert.equal(isoDate(d), '2026-10-14');
  assert.equal(formatDate(d), '14.10.2026');
  assert.equal(isoDate(d + 18), '2026-11-01');
  assert.equal(dayNumber(new Date(2026, 9, 14, 23, 59)), d);
  assert.equal(dayNumber(new Date(2026, 9, 14, 0, 1)), d);
});

test('Wochentage: 14.10.2026 ist ein Mittwoch, Woche beginnt am Montag', () => {
  const wed = dayFromIso('2026-10-14');
  assert.equal(weekdayIndex(wed), 2);
  assert.equal(weekdayIndex(dayFromIso('2026-10-12')), 0); // Montag
  assert.equal(weekdayIndex(dayFromIso('2026-10-18')), 6); // Sonntag
  assert.equal(weekId(dayFromIso('2026-10-12')), weekId(dayFromIso('2026-10-18')));
  assert.notEqual(weekId(dayFromIso('2026-10-18')), weekId(dayFromIso('2026-10-19')));
});

test('relative Tage', () => {
  assert.equal(relativeDays(10, 10), 'heute');
  assert.equal(relativeDays(11, 10), 'morgen');
  assert.equal(relativeDays(14, 10), 'in 4 Tagen');
});

// ---------- Streak ----------
const D = (iso) => dayFromIso(iso);

test('Streak zählt aufeinanderfolgende Tage', () => {
  let s = EMPTY_STREAK;
  s = recordGoalMet(s, D('2026-10-12'));
  s = recordGoalMet(s, D('2026-10-13'));
  s = recordGoalMet(s, D('2026-10-14'));
  assert.equal(s.count, 3);
  assert.equal(recordGoalMet(s, D('2026-10-14')).count, 3, 'zweites Mal am selben Tag zählt nicht doppelt');
});

test('Streak ist gefährdet, wenn heute noch nichts getan wurde', () => {
  const s = { count: 5, lastDay: D('2026-10-13'), freezeWeek: null };
  const c = currentStreak(s, D('2026-10-14'));
  assert.deepEqual(c, { count: 5, doneToday: false, atRisk: true, usesFreeze: false });
});

test('Schonfrist: ein verpasster Tag pro Woche rettet die Serie', () => {
  const s = { count: 5, lastDay: D('2026-10-12'), freezeWeek: null }; // Montag geschafft, Dienstag verpasst
  const wed = D('2026-10-14');
  assert.equal(currentStreak(s, wed).count, 5);
  assert.equal(currentStreak(s, wed).usesFreeze, true);
  const after = recordGoalMet(s, wed);
  assert.equal(after.count, 6);
  assert.equal(after.freezeWeek, weekId(D('2026-10-13')));
});

test('Schonfrist nur einmal pro Woche', () => {
  let s = { count: 5, lastDay: D('2026-10-12'), freezeWeek: null };
  s = recordGoalMet(s, D('2026-10-14')); // Dienstag verpasst -> Schonfrist
  // Donnerstag verpasst, Freitag geschafft -> gleiche Woche, keine zweite Schonfrist
  const fri = D('2026-10-16');
  assert.equal(currentStreak(s, fri).count, 0);
  assert.equal(recordGoalMet(s, fri).count, 1);
});

test('Schonfrist erneuert sich in der nächsten Woche', () => {
  let s = { count: 5, lastDay: D('2026-10-12'), freezeWeek: null };
  s = recordGoalMet(s, D('2026-10-14'));
  s = recordGoalMet(s, D('2026-10-18')); // Sonntag: Do/Fr/Sa verpasst -> Serie weg
  assert.equal(s.count, 1);
  const base = { count: 4, lastDay: D('2026-10-19'), freezeWeek: weekId(D('2026-10-14')) };
  assert.equal(recordGoalMet(base, D('2026-10-21')).count, 5, 'neue Woche, Schonfrist wieder frei');
});

test('Serie reißt bei zwei verpassten Tagen', () => {
  const s = { count: 9, lastDay: D('2026-10-10'), freezeWeek: null };
  assert.equal(currentStreak(s, D('2026-10-13')).count, 0);
  assert.equal(recordGoalMet(s, D('2026-10-13')).count, 1);
});

// ---------- Klassenarbeit ----------
test('Bereitschaft: neue Karten zählen 0, gelernte Karten am Testtag', () => {
  assert.equal(readiness([], 10, 0), 0);
  assert.equal(readiness([null, null], 10, 0), 0);
  const learned = review(null, RATING.GOOD, 0);
  const r = readiness([learned, null], learned.due, 0);
  assert.ok(r > 0.4 && r < 0.5, `r=${r}`);
});

test('Neue Vokabeln pro Tag mit Puffertag', () => {
  assert.equal(newPerDay(0, 10, 0), 0);
  assert.equal(newPerDay(30, 11, 1), 4); // 10 Tage bis zum Test, 1 Puffertag -> 9 Lerntage -> 30/9 aufgerundet
  assert.equal(newPerDay(5, 1, 1), 5, 'Test heute: alles auf einmal');
  assert.equal(newPerDay(5, 2, 1), 5, 'Test morgen: alles heute');
});

test('Noten', () => {
  assert.equal(gradeFor(100).grade, 1);
  assert.equal(gradeFor(92).grade, 1);
  assert.equal(gradeFor(91.9).grade, 2);
  assert.equal(gradeFor(66).grade, 4);
  assert.equal(gradeFor(50).grade, 4);
  assert.equal(gradeFor(49).grade, 5);
  assert.equal(gradeFor(0).grade, 6);
});

// ---------- Erinnerungen ----------
test('Erinnerungszeiten: nur Zukunft, heute überspringbar', () => {
  const today = D('2026-10-14');
  const now = new Date(2026, 9, 14, 12, 0);
  const all = reminderTimes({ now, today, hour: 16, minute: 30, days: 3 });
  assert.equal(all.length, 3);
  assert.equal(all[0].getHours(), 16);
  assert.equal(all[0].getDate(), 14);
  const skip = reminderTimes({ now, today, hour: 16, minute: 30, days: 3, skipToday: true });
  assert.equal(skip.length, 2);
  assert.equal(skip[0].getDate(), 15);
  const late = reminderTimes({ now: new Date(2026, 9, 14, 17, 0), today, hour: 16, minute: 30, days: 3 });
  assert.equal(late.length, 2, 'heutiger Zeitpunkt liegt schon in der Vergangenheit');
});

test('Zeit lesen und Texte', () => {
  assert.deepEqual(parseTime('07:05'), { hour: 7, minute: 5 });
  assert.deepEqual(parseTime('25:00'), { hour: 16, minute: 30 });
  assert.deepEqual(parseTime(''), { hour: 16, minute: 30 });
  assert.match(reminderText(5).title, /5 Tage/);
  assert.equal(reminderText(0).title, 'Zeit für Vokabeln');
  assert.equal(localDateAt(D('2026-10-14'), 9, 5).getMinutes(), 5);
});
