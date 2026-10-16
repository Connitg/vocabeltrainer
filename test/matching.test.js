import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAnswer, normalize, editDistance, acceptedAnswers, pairKey } from '../www/js/matching.js';

const r = (input, expected) => checkAnswer(input, expected);

test('exakt richtig, Groß-/Kleinschreibung und Leerzeichen egal', () => {
  assert.equal(r('chat', 'chat').result, 'correct');
  assert.equal(r('  Chat ', 'chat').result, 'correct');
  assert.equal(r('Bonjour!', 'bonjour').result, 'correct');
});

test('Apostroph-Varianten sind gleich', () => {
  assert.equal(r('l’ami', "l'ami").result, 'correct');
  assert.equal(r("l`ami", "l'ami").result, 'correct');
});

test('Akzent fehlt oder falsch -> fast richtig (Akzent)', () => {
  const a = r('cafe', 'café');
  assert.equal(a.result, 'near');
  assert.equal(a.reason, 'accent');
  assert.equal(a.answer, 'café');
  assert.equal(r('éte', 'été').result, 'near');
});

test('ein Tippfehler bei Wörtern ab 4 Buchstaben -> fast richtig', () => {
  assert.equal(r('maisn', 'maison').reason, 'typo');
  assert.equal(r('mauson', 'maison').result, 'near');
  assert.equal(r('chta', 'chat').reason, 'typo'); // vertauschte Buchstaben
});

test('kurze Wörter: keine Tippfehler-Toleranz', () => {
  assert.equal(r('le', 'la').result, 'wrong');
  assert.equal(r('cat', 'dog').result, 'wrong');
  assert.equal(r('ca', 'cat').result, 'wrong');
});

test('zwei Fehler bei kurzen Wörtern sind falsch, bei langen Wörtern (ab 10) erlaubt', () => {
  assert.equal(r('mison', 'maison').result, 'near'); // 1 Fehler
  assert.equal(r('maxxon', 'maison').result, 'wrong'); // 2 Fehler
  assert.equal(r('entreprize', 'entreprise').result, 'near');
  assert.equal(r('entreprixe', 'entreprise').result, 'near'); // 1 Fehler
  assert.equal(r('entrepxixe', 'entreprise').result, 'near'); // 2 Fehler, Wort >= 10
});

test('Artikel fehlt oder ist zu viel -> fast richtig', () => {
  assert.equal(r('ami', "l'ami").reason, 'article');
  assert.equal(r('chat', 'le chat').reason, 'article');
  assert.equal(r('le chat', 'chat').reason, 'article');
  assert.equal(r('run', 'to run').reason, 'article');
});

test('mehrere richtige Antworten mit / oder ;', () => {
  assert.equal(r('chatte', 'chat / chatte').result, 'correct');
  assert.equal(r('chat', 'chat/chatte').result, 'correct');
  assert.equal(r('chat / chatte', 'chat / chatte').result, 'correct');
  assert.equal(r('jog', 'run; jog').result, 'correct');
});

test('Klammern sind optional', () => {
  assert.equal(r('laver', '(se) laver').result, 'correct');
  assert.equal(r('se laver', '(se) laver').result, 'correct');
});

test('leere Eingabe ist falsch und liefert die Lösung', () => {
  const a = r('', 'chat');
  assert.equal(a.result, 'wrong');
  assert.equal(a.answer, 'chat');
});

test('falsche Antwort liefert die komplette Lösung zur Anzeige', () => {
  const a = r('hund', 'chat / chatte');
  assert.equal(a.result, 'wrong');
  assert.equal(a.answer, 'chat / chatte');
});

test('Hilfsfunktionen', () => {
  assert.equal(normalize('  Wi-Fi, bitte! '), 'wi fi bitte');
  assert.equal(editDistance('kitten', 'sitting'), 3);
  assert.equal(editDistance('ab', 'ba'), 1);
  assert.deepEqual(acceptedAnswers('a / b').sort(), ['a', 'a / b', 'b']);
  assert.equal(pairKey('Katze', 'Chat'), pairKey(' katze', 'chat '));
});
