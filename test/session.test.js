import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRound, cardKey, groupCards, countCards, introducedToday, shouldApplyReview, pickAutoMode, RoundQueue } from '../www/js/session.js';
import { review, RATING } from '../www/js/fsrs.js';

const T = 1000;
let n = 0;
const v = (german, foreign, extra = {}) => ({
  id: `v${++n}`,
  languageId: 'en',
  folderId: 'f1',
  german,
  foreign,
  srs: null,
  ...extra,
});
const seeded = () => {
  let s = 42;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

test('Dubletten aus mehreren Ordnern sind eine Karte', () => {
  const a = v('Katze', 'cat', { folderId: 'f1' });
  const b = v('katze ', 'Cat', { folderId: 'f2' });
  const c = v('Hund', 'dog');
  const groups = groupCards([a, b, c]);
  assert.equal(groups.size, 2);
  assert.equal(groups.get(cardKey(a)).entries.length, 2);
});

test('Dublette übernimmt den Lernstand mit dem meisten Fortschritt', () => {
  const srs = review(null, RATING.GOOD, T - 4);
  const a = v('Katze', 'cat', { folderId: 'f1' });
  const b = v('Katze', 'cat', { folderId: 'f2', srs });
  const g = groupCards([a, b]).get(cardKey(a));
  assert.equal(g.srs, srs);
  assert.equal(g.rep, b);
});

test('Runde "fällig": fällige zuerst, neue nur im Limit', () => {
  const due = [1, 2, 3].map((i) => v(`d${i}`, `D${i}`, { srs: { ...review(null, RATING.GOOD, T - 10), due: T - 1 } }));
  const later = v('später', 'later', { srs: { ...review(null, RATING.GOOD, T), due: T + 5 } });
  const fresh = [1, 2, 3, 4, 5].map((i) => v(`n${i}`, `N${i}`));
  const round = buildRound([...due, later, ...fresh], { today: T, mode: 'due', newLimit: 2, rng: seeded() });
  assert.equal(round.length, 5, '3 fällige + 2 neue');
  assert.equal(round.filter((r) => r.isNew).length, 2);
  assert.ok(!round.some((r) => r.key === cardKey(later)), 'nicht fällige Karte fehlt');
});

test('Runde ist auf 20 Karten begrenzt', () => {
  const many = Array.from({ length: 50 }, (_, i) => v(`w${i}`, `W${i}`));
  assert.equal(buildRound(many, { today: T, mode: 'due', newLimit: 50 }).length, 20);
  assert.equal(buildRound(many, { today: T, mode: 'all' }).length, 20);
});

test('neue Karten: Limit 0 -> keine', () => {
  const fresh = [v('a', 'A'), v('b', 'B')];
  assert.equal(buildRound(fresh, { today: T, mode: 'due', newLimit: 0 }).length, 0);
});

test('"Alles üben": nicht fällige Karten kommen dran, schwächste zuerst; exclude sperrt', () => {
  const weak = v('weak', 'W', { srs: { ...review(null, RATING.GOOD, T - 3), due: T + 1 } });
  const strong = v('strong', 'S', { srs: { ...review(null, RATING.EASY, T - 1), due: T + 13 } });
  const round = buildRound([strong, weak], { today: T, mode: 'all', rng: () => 0.5 });
  assert.equal(round.length, 2);
  const sorted = buildRound([strong, weak], { today: T, mode: 'all', roundSize: 1 });
  assert.equal(sorted[0].key, cardKey(weak));
  const ex = buildRound([strong, weak], { today: T, mode: 'all', exclude: new Set([cardKey(weak)]) });
  assert.equal(ex.length, 1);
  assert.equal(ex[0].key, cardKey(strong));
});

test('countCards zählt Dubletten einmal', () => {
  const srsOld = review(null, RATING.EASY, T - 20);
  const list = [
    v('a', 'A'),
    v('a', 'A', { folderId: 'f2' }),
    v('b', 'B', { srs: { ...srsOld, due: T - 2 } }),
    v('c', 'C', { srs: { ...review(null, RATING.GOOD, T), due: T + 3 } }),
  ];
  const c = countCards(list, T);
  assert.equal(c.total, 3);
  assert.equal(c.fresh, 1);
  assert.equal(c.due, 1);
  assert.equal(c.mature, 0);
  assert.equal(c.learning, 2);
});

test('introducedToday', () => {
  const list = [
    v('a', 'A', { srs: { ...review(null, RATING.GOOD, T), due: T + 3 } }),
    v('b', 'B', { srs: { ...review(null, RATING.GOOD, T - 1), due: T + 3 } }),
    v('c', 'C', { languageId: 'fr', srs: { ...review(null, RATING.GOOD, T), due: T + 3 } }),
  ];
  assert.equal(introducedToday(list, 'en', T), 1);
});

test('Lernplan ändert sich nur bei neuen/fälligen Karten oder wenn man es vergessen hat', () => {
  const srs = { ...review(null, RATING.GOOD, T - 1), due: T + 3 };
  assert.equal(shouldApplyReview(null, RATING.GOOD, T), true);
  assert.equal(shouldApplyReview({ ...srs, due: T }, RATING.GOOD, T), true);
  assert.equal(shouldApplyReview(srs, RATING.GOOD, T), false);
  assert.equal(shouldApplyReview(srs, RATING.AGAIN, T), true);
});

test('Auto-Modus: junge Karten als Karteikarte, sichere getippt', () => {
  assert.equal(pickAutoMode(null), 'flash');
  assert.equal(pickAutoMode({ stability: 2 }), 'flash');
  assert.equal(pickAutoMode({ stability: 8 }), 'type');
});

test('Warteschlange: neue Karte erst zeigen, dann nach 3 Karten abfragen', () => {
  const q = new RoundQueue([
    { key: 'n', isNew: true },
    { key: 'a', isNew: false },
    { key: 'b', isNew: false },
    { key: 'c', isNew: false },
    { key: 'd', isNew: false },
  ]);
  assert.equal(q.current.phase, 'intro');
  q.introDone();
  assert.deepEqual(q.items.map((i) => i.key), ['a', 'b', 'c', 'n', 'd']);
  assert.equal(q.items[3].phase, 'ask');
});

test('Warteschlange: falsche Karte kommt wieder, zählt aber nur beim ersten Mal für den Lernplan', () => {
  const q = new RoundQueue([
    { key: 'a', isNew: false },
    { key: 'b', isNew: false },
  ]);
  assert.deepEqual(q.answer(RATING.AGAIN), { firstAttempt: true });
  assert.deepEqual(q.items.map((i) => i.key), ['b', 'a']);
  q.answer(RATING.GOOD); // b
  assert.deepEqual(q.answer(RATING.GOOD), { firstAttempt: false }); // a im zweiten Versuch
  assert.equal(q.remaining, 0);
  assert.equal(q.finished, 2);
});
