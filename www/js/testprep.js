// Klassenarbeits-Modus: Bereitschaft, Tagesplan, Note.

import { retrievabilityAt } from './fsrs.js';

/**
 * Wie sicher sitzen die Vokabeln am Testtag? (0 bis 1)
 * Neue Vokabeln zählen als 0. Ist der Test schon vorbei, zählt der heutige Stand.
 * @param {Array<object|null>} srsList Lernstände (null = neu)
 */
export function readiness(srsList, testDay, today) {
  if (!srsList.length) return 0;
  const day = Math.max(testDay, today);
  const sum = srsList.reduce((acc, srs) => acc + retrievabilityAt(srs, day), 0);
  return sum / srsList.length;
}

/** Neue Vokabeln pro Tag, damit bis zum Test alles mindestens einmal gelernt ist (ein Puffertag bleibt). */
export function newPerDay(unseenCount, testDay, today) {
  if (unseenCount <= 0) return 0;
  const daysLeft = Math.max(1, testDay - today - 1);
  return Math.ceil(unseenCount / daysLeft);
}

/** Standard-Notenschlüssel (in Prozent der erreichbaren Punkte). */
export const GRADE_SCALE = [
  { min: 92, grade: 1, label: 'sehr gut' },
  { min: 81, grade: 2, label: 'gut' },
  { min: 67, grade: 3, label: 'befriedigend' },
  { min: 50, grade: 4, label: 'ausreichend' },
  { min: 30, grade: 5, label: 'mangelhaft' },
  { min: 0, grade: 6, label: 'ungenügend' },
];

export function gradeFor(percent) {
  return GRADE_SCALE.find((g) => percent >= g.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
}
