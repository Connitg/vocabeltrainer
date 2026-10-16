import test from 'node:test';
import assert from 'node:assert/strict';
import { W, retrievability, intervalFor, schedule, review, previewIntervals, RATING, maturity, retrievabilityAt, formatInterval } from '../www/js/fsrs.js';

const close = (a, b, eps = 0.05) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test('Erinnerung: nach S Tagen sind es 90 %', () => {
  close(retrievability(5, 5), 0.9, 1e-9);
  close(retrievability(0, 5), 1, 1e-9);
});

test('Abstand bei 90 % Wunsch = Stabilität', () => {
  assert.equal(intervalFor(10, 0.9), 10);
  assert.ok(intervalFor(10, 0.8) > 10);
});

test('neue Karte: Anfangswerte aus den Gewichten', () => {
  const s = schedule(null, 100);
  close(s[1].stability, W[0], 1e-9);
  close(s[3].stability, W[2], 1e-9);
  close(s[4].stability, W[3], 1e-9);
  close(s[3].difficulty, W[4], 1e-9);
  assert.equal(s[1].first, 100);
  assert.equal(s[3].last, 100);
});

test('neue Karte: Abstände Nochmal 1, Gut 4, Leicht 14, Schwer < Gut', () => {
  const iv = previewIntervals(null, 100);
  assert.deepEqual(iv, { 1: 1, 2: 1, 3: 4, 4: 14 });
});

test('Wiederholung nach 4 Tagen mit "Gut" -> ca. 15 Tage', () => {
  const first = review(null, RATING.GOOD, 100);
  const second = review(first, RATING.GOOD, first.due);
  close(second.stability, 14.8, 0.2);
  assert.equal(second.due - second.last, 15);
  assert.equal(second.reps, 2);
});

test('Reihenfolge der Abstände: Nochmal ≤ Schwer < Gut < Leicht', () => {
  let card = review(null, RATING.GOOD, 0);
  let day = card.due;
  for (let i = 0; i < 6; i++) {
    const iv = previewIntervals(card, day);
    assert.ok(iv[1] <= iv[2], 'again <= hard');
    assert.ok(iv[2] < iv[3] || iv[3] === 365, 'hard < good');
    assert.ok(iv[3] < iv[4] || iv[4] === 365, 'good < easy');
    card = review(card, RATING.GOOD, day);
    day = card.due;
  }
});

test('Vergessen: Stabilität sinkt, Lapse wird gezählt, morgen wieder dran', () => {
  const good = review(null, RATING.GOOD, 0);
  const next = review(good, RATING.GOOD, good.due);
  const lapsed = review(next, RATING.AGAIN, next.due);
  assert.ok(lapsed.stability < next.stability);
  assert.equal(lapsed.lapses, 1);
  assert.equal(lapsed.due, next.due + 1);
});

test('Stabilität wächst bei richtigen Antworten und Abstand deckelt bei 365 Tagen', () => {
  let card = review(null, RATING.EASY, 0);
  let day = 0;
  for (let i = 0; i < 12; i++) {
    day = card.due;
    card = review(card, RATING.EASY, day);
  }
  assert.ok(card.due - card.last <= 365);
});

test('Reife-Stufen', () => {
  assert.equal(maturity(null), 'neu');
  assert.equal(maturity({ reps: 1, stability: 3 }), 'lernend');
  assert.equal(maturity({ reps: 4, stability: 30 }), 'sicher');
});

test('retrievabilityAt: neue Karte = 0', () => {
  assert.equal(retrievabilityAt(null, 10), 0);
  const c = review(null, RATING.GOOD, 0);
  assert.ok(retrievabilityAt(c, c.due) > 0.85);
});

test('Intervall-Beschriftung', () => {
  assert.equal(formatInterval(1), '1 T');
  assert.equal(formatInterval(10), '10 T');
  assert.equal(formatInterval(21), '3 Wo');
  assert.equal(formatInterval(90), '3 Mon');
});
