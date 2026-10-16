import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeState, parseBackup } from '../www/js/store.js';

const lang = { id: 'l1', name: 'Französisch', flag: '🇫🇷', tts: 'fr-FR' };
const folder = { id: 'f1', languageId: 'l1', name: 'Unit 1', createdAt: 1 };
const goodSrs = { stability: 3.2, difficulty: 5, reps: 1, lapses: 0, first: 100, last: 100, due: 103 };

test('Backup: kaputte Verweise werden entfernt, Gutes bleibt', () => {
  const s = normalizeState({
    languages: [lang, { id: 5 }],
    folders: [folder, { id: 'f2', languageId: 'gibt-es-nicht', name: 'x' }],
    vocabs: [
      { id: 'v1', languageId: 'l1', folderId: 'f1', german: 'Haus', foreign: 'la maison', srs: goodSrs },
      { id: 'v2', languageId: 'l1', folderId: 'f2', german: 'weg', foreign: 'weg' },
      { id: 'v3', languageId: 'l1', folderId: 'f1', german: 123, foreign: 'x' },
    ],
    tests: [{ id: 't1', title: 'T', languageId: 'l1', folderIds: ['f2'], date: 1 }],
  });
  assert.equal(s.languages.length, 1);
  assert.equal(s.folders.length, 1);
  assert.equal(s.vocabs.length, 1);
  assert.equal(s.tests.length, 0, 'Test ohne vorhandene Ordner wird entfernt');
  assert.deepEqual(s.vocabs[0].srs.due, 103);
});

test('Backup: kaputter Lernstand wird zu "noch nicht gelernt"', () => {
  const bad = [null, 'text', {}, { stability: 'x', difficulty: 1, due: 1 }, { stability: -1, difficulty: 1, due: 1 }, { stability: 2, difficulty: 1, due: NaN }];
  for (const srs of bad) {
    const s = normalizeState({ languages: [lang], folders: [folder], vocabs: [{ id: 'v', languageId: 'l1', folderId: 'f1', german: 'a', foreign: 'b', srs }] });
    assert.equal(s.vocabs[0].srs, null, JSON.stringify(srs));
  }
});

test('Backup: Einstellungen bekommen Standardwerte, Fremdes wird nicht übernommen', () => {
  const s = normalizeState({ languages: [], vocabs: [], settings: { dailyGoal: 25 } });
  assert.equal(s.settings.dailyGoal, 25);
  assert.equal(s.settings.newPerDay, 10);
  assert.equal(s.settings.reminderTime, '16:30');
});

test('parseBackup: Müll wird abgelehnt', () => {
  assert.equal(parseBackup('kein json').ok, false);
  assert.equal(parseBackup('{"a":1}').ok, false);
  assert.equal(parseBackup('[]').ok, false);
  const ok = parseBackup(JSON.stringify({ languages: [lang], folders: [folder], vocabs: [] }));
  assert.equal(ok.ok, true);
  assert.equal(ok.counts.languages, 1);
});
