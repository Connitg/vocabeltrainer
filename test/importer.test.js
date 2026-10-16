import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePairs } from '../www/js/importer.js';

test('Tabulator (Quizlet/Excel)', () => {
  const { pairs } = parsePairs('Hund\tchien\nKatze\tchat');
  assert.deepEqual(pairs, [
    { german: 'Hund', foreign: 'chien' },
    { german: 'Katze', foreign: 'chat' },
  ]);
});

test('Gedankenstrich mit Leerzeichen, auch – und —', () => {
  const { pairs } = parsePairs('Haus - maison\nBaum – arbre\nBuch — livre');
  assert.equal(pairs.length, 3);
  assert.equal(pairs[1].foreign, 'arbre');
});

test('Wörter mit Bindestrich bleiben heil, wenn es ein anderes Trennzeichen gibt', () => {
  const { pairs } = parsePairs('Wlan = Wi-Fi\nVater-Sohn - père-fils');
  assert.deepEqual(pairs[0], { german: 'Wlan', foreign: 'Wi-Fi' });
  assert.deepEqual(pairs[1], { german: 'Vater-Sohn', foreign: 'père-fils' });
});

test('Semikolon, Komma, Doppelpunkt, senkrechter Strich', () => {
  const { pairs } = parsePairs('a;b\nc,d\ne:f\ng|h');
  assert.equal(pairs.length, 4);
});

test('einfacher Bindestrich ohne Leerzeichen (genau einer)', () => {
  const { pairs } = parsePairs('Haus-maison');
  assert.deepEqual(pairs, [{ german: 'Haus', foreign: 'maison' }]);
});

test('mehrdeutige Zeilen werden übersprungen und gemeldet', () => {
  const { pairs, skipped } = parsePairs('Katze, Kater, chat\nnur ein Wort\nHund - chien');
  assert.equal(pairs.length, 1);
  assert.deepEqual(skipped, ['Katze, Kater, chat', 'nur ein Wort']);
});

test('leere Zeilen und Anführungszeichen', () => {
  const { pairs } = parsePairs('\n"Haus","maison"\n\n');
  assert.deepEqual(pairs, [{ german: 'Haus', foreign: 'maison' }]);
});

test('Spalten tauschen', () => {
  const { pairs } = parsePairs('maison - Haus', { swap: true });
  assert.deepEqual(pairs, [{ german: 'Haus', foreign: 'maison' }]);
});

test('Dubletten im eingefügten Text werden gezählt und entfernt', () => {
  const { pairs, duplicates } = parsePairs('Haus - maison\nhaus - Maison\nBaum - arbre');
  assert.equal(pairs.length, 2);
  assert.equal(duplicates, 1);
});

test('mehr als zwei Spalten: Rest wird ignoriert', () => {
  const { pairs } = parsePairs('Haus\tmaison\tla maison (f)');
  assert.deepEqual(pairs, [{ german: 'Haus', foreign: 'maison' }]);
});

test('leerer Text', () => {
  const r = parsePairs('');
  assert.deepEqual(r, { pairs: [], skipped: [], duplicates: 0 });
});
