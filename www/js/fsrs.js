// FSRS-4.5 (Free Spaced Repetition Scheduler), auf ganze Tage gerundet.
// Formeln und Standard-Gewichte: open-spaced-repetition (FSRS-4.5).
//
// Eine Vokabel ohne Lernstand ist "neu" (srs = null). Nach der ersten Bewertung gibt es:
//   { stability, difficulty, reps, lapses, first, last, due }
// stability  = Anzahl Tage, nach denen man sich noch zu 90 % erinnert
// difficulty = 1 (leicht) bis 10 (schwer)
// first/last/due = Tageszahlen (siehe dates.js)

export const RATING = Object.freeze({ AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 });

export const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072,
  0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];

const DECAY = -0.5;
const FACTOR = 19 / 81;
const MAX_INTERVAL = 365;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Wahrscheinlichkeit, dass man sich nach `elapsedDays` Tagen noch erinnert. */
export function retrievability(elapsedDays, stability) {
  return Math.pow(1 + (FACTOR * Math.max(0, elapsedDays)) / stability, DECAY);
}

/** Abstand in Tagen, nach dem die Erinnerung auf `retention` gefallen ist. */
export function intervalFor(stability, retention = 0.9) {
  return Math.round((stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1));
}

const initDifficulty = (g) => clamp(W[4] - (g - 3) * W[5], 1, 10);

function nextDifficulty(d, g) {
  return clamp(W[7] * W[4] + (1 - W[7]) * (d - W[6] * (g - 3)), 1, 10);
}

function recallStability(d, s, r, g) {
  const hard = g === RATING.HARD ? W[15] : 1;
  const easy = g === RATING.EASY ? W[16] : 1;
  return (
    s *
    (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy +
      1)
  );
}

function forgetStability(d, s, r) {
  const next = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  return Math.min(next, s);
}

function computeNext(srs, g, today) {
  if (!srs || !srs.reps) {
    return {
      stability: W[g - 1],
      difficulty: initDifficulty(g),
      reps: 1,
      lapses: g === RATING.AGAIN ? 1 : 0,
    };
  }
  const elapsed = Math.max(0, today - srs.last);
  const r = retrievability(elapsed, srs.stability);
  const difficulty = nextDifficulty(srs.difficulty, g);
  const stability =
    g === RATING.AGAIN
      ? forgetStability(srs.difficulty, srs.stability, r)
      : recallStability(srs.difficulty, srs.stability, r, g);
  return {
    stability: Math.max(0.1, stability),
    difficulty,
    reps: srs.reps + 1,
    lapses: srs.lapses + (g === RATING.AGAIN ? 1 : 0),
  };
}

/**
 * Berechnet für alle vier Bewertungen den neuen Lernstand.
 * Rückgabe: { 1: srs, 2: srs, 3: srs, 4: srs } mit stimmigen Abständen (schwer < gut < leicht).
 */
export function schedule(srs, today, opts = {}) {
  const retention = opts.retention ?? 0.9;
  const maxInterval = opts.maxInterval ?? MAX_INTERVAL;
  const states = {};
  for (const g of [1, 2, 3, 4]) states[g] = computeNext(srs, g, today);

  const iv = { 1: 1 };
  for (const g of [2, 3, 4]) iv[g] = Math.max(1, intervalFor(states[g].stability, retention));
  iv[2] = Math.min(iv[2], iv[3]);
  iv[3] = Math.max(iv[3], iv[2] + 1);
  iv[4] = Math.max(iv[4], iv[3] + 1);

  const first = srs?.first ?? today;
  const out = {};
  for (const g of [1, 2, 3, 4]) {
    const interval = Math.min(iv[g], maxInterval);
    out[g] = { ...states[g], first, last: today, due: today + interval };
  }
  return out;
}

/** Neuer Lernstand nach einer Bewertung. */
export function review(srs, rating, today, opts = {}) {
  return schedule(srs, today, opts)[rating];
}

/** Abstände in Tagen für die vier Knöpfe, z. B. { 1: 1, 2: 1, 3: 4, 4: 14 }. */
export function previewIntervals(srs, today, opts = {}) {
  const s = schedule(srs, today, opts);
  const out = {};
  for (const g of [1, 2, 3, 4]) out[g] = s[g].due - today;
  return out;
}

/** Erinnerungswahrscheinlichkeit am Tag `day` (0 für neue Vokabeln). */
export function retrievabilityAt(srs, day) {
  if (!srs || !srs.reps) return 0;
  return retrievability(Math.max(0, day - srs.last), srs.stability);
}

/** 'neu' | 'lernend' | 'sicher' */
export function maturity(srs) {
  if (!srs || !srs.reps) return 'neu';
  return srs.stability >= 21 ? 'sicher' : 'lernend';
}

/** Kurztext für Knopf-Beschriftung: 1 T, 4 T, 2 Wo, 3 Mon */
export function formatInterval(days) {
  if (days < 1) return '<1 T';
  if (days < 14) return `${days} T`;
  if (days < 60) return `${Math.round(days / 7)} Wo`;
  return `${Math.round(days / 30)} Mon`;
}
