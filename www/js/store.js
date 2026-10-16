// Der gesamte Zustand der App (Sprachen, Ordner, Vokabeln, Klassenarbeiten, Einstellungen).
// Wird automatisch gespeichert. Alle Änderungen laufen über die Funktionen in dieser Datei.

import { loadState, saveState, clearState } from './storage.js';
import { dayNumber, formatDate } from './dates.js';
import { cardKey, shouldApplyReview, groupCards } from './session.js';
import { review } from './fsrs.js';
import { recordGoalMet, EMPTY_STREAK } from './streak.js';

export const SCHEMA_VERSION = 1;

function defaults() {
  return {
    v: SCHEMA_VERSION,
    savedAt: 0,
    languages: [],
    folders: [],
    vocabs: [],
    tests: [],
    settings: {
      dailyGoal: 10,
      newPerDay: 10,
      cardDirection: 'de-fo', // 'de-fo' | 'fo-de' | 'mixed'
      autoSpeak: false,
      reminderOn: false,
      reminderTime: '16:30',
      skipIfDone: true,
      mode: 'auto', // 'auto' | 'flash' | 'type' | 'draw'
    },
    streak: { ...EMPTY_STREAK },
    days: {}, // { [Tageszahl]: { r: Karten, g: 1 wenn Tagesziel erreicht } }
  };
}

let state = defaults();
const subscribers = new Set();
let saveTimer = null;

export function uid() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {
    /* kein sicherer Kontext */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function get() {
  return state;
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function touch() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 350);
  subscribers.forEach((fn) => fn(state));
}

export async function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  state.savedAt = Date.now();
  await saveState(JSON.stringify(state));
}

// ---------- Laden, Prüfen, Sichern ----------

const isStr = (x) => typeof x === 'string';

/** Lernstand einer Vokabel prüfen. Ein kaputter Stand wird zu "noch nicht gelernt", damit die App nie hängt. */
function cleanSrs(srs) {
  if (!srs || typeof srs !== 'object') return null;
  const { stability, difficulty, due } = srs;
  if (![stability, difficulty, due].every(Number.isFinite) || stability <= 0) return null;
  const num = (x, fallback) => (Number.isFinite(x) ? x : fallback);
  return { ...srs, reps: num(srs.reps, 0), lapses: num(srs.lapses, 0), first: num(srs.first, due), last: num(srs.last, due) };
}

export function normalizeState(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const arr = (x) => (Array.isArray(x) ? x : []);
  const languages = arr(raw.languages).filter((l) => l && isStr(l.id) && isStr(l.name));
  const langIds = new Set(languages.map((l) => l.id));
  const folders = arr(raw.folders).filter((f) => f && isStr(f.id) && isStr(f.name) && langIds.has(f.languageId));
  const folderIds = new Set(folders.map((f) => f.id));
  const vocabs = arr(raw.vocabs)
    .filter((v) => v && isStr(v.id) && isStr(v.german) && isStr(v.foreign) && langIds.has(v.languageId) && folderIds.has(v.folderId))
    .map((v) => ({ ...v, createdAt: Number.isFinite(v.createdAt) ? v.createdAt : 0, srs: cleanSrs(v.srs) }));
  const tests = arr(raw.tests)
    .filter((t) => t && isStr(t.id) && isStr(t.title) && langIds.has(t.languageId) && Number.isFinite(t.date))
    .map((t) => ({ ...t, folderIds: arr(t.folderIds).filter((id) => folderIds.has(id)) }))
    .filter((t) => t.folderIds.length > 0);
  return {
    ...d,
    ...raw,
    v: SCHEMA_VERSION,
    languages,
    folders,
    vocabs,
    tests,
    settings: { ...d.settings, ...(raw.settings && typeof raw.settings === 'object' ? raw.settings : {}) },
    streak: { ...EMPTY_STREAK, ...(raw.streak && typeof raw.streak === 'object' ? raw.streak : {}) },
    days: raw.days && typeof raw.days === 'object' ? raw.days : {},
  };
}

export async function init() {
  const text = await loadState();
  if (text) {
    try {
      state = normalizeState(JSON.parse(text));
    } catch {
      state = defaults();
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', () => {
    flush();
  });
}

export function exportJson() {
  return JSON.stringify({ ...state, app: 'learnapp', exportedAt: new Date().toISOString() });
}

/** Prüft eine Backup-Datei, ohne etwas zu ändern. */
export function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Die Datei ist keine gültige Backup-Datei.' };
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.languages) || !Array.isArray(raw.vocabs)) {
    return { ok: false, error: 'Das ist keine LearnApp-Sicherung.' };
  }
  const next = normalizeState(raw);
  return {
    ok: true,
    state: next,
    counts: { languages: next.languages.length, folders: next.folders.length, vocabs: next.vocabs.length },
  };
}

export function replaceAll(next) {
  state = next;
  touch();
}

export async function resetAll() {
  state = defaults();
  await clearState();
  touch();
}

// ---------- Abfragen ----------

export const languageById = (id) => state.languages.find((l) => l.id === id) ?? null;
export const folderById = (id) => state.folders.find((f) => f.id === id) ?? null;
export const testById = (id) => state.tests.find((t) => t.id === id) ?? null;
export const foldersOf = (languageId) => state.folders.filter((f) => f.languageId === languageId);
export const vocabsInLanguage = (languageId) => state.vocabs.filter((v) => v.languageId === languageId);
export const vocabsInFolder = (folderId) => state.vocabs.filter((v) => v.folderId === folderId);

/** Vokabeln eines Lernbereichs: { languageId, folderIds?: string[]|null, keys?: string[]|null } */
export function vocabsForScope(scope) {
  let list = vocabsInLanguage(scope.languageId);
  if (scope.folderIds) {
    const ids = new Set(scope.folderIds);
    list = list.filter((v) => ids.has(v.folderId));
  }
  if (scope.keys) {
    const keys = new Set(scope.keys);
    list = list.filter((v) => keys.has(cardKey(v)));
  }
  return list;
}

export function reviewsToday() {
  return state.days[dayNumber()]?.r ?? 0;
}

// ---------- Sprachen ----------

export function addLanguage({ name, flag = '🌍', tts = '' }) {
  const lang = { id: uid(), name: name.trim(), flag, tts, createdAt: Date.now() };
  state.languages.push(lang);
  touch();
  return lang;
}

export function updateLanguage(id, patch) {
  const lang = languageById(id);
  if (!lang) return;
  if (patch.name != null) lang.name = patch.name.trim() || lang.name;
  if (patch.flag != null) lang.flag = patch.flag;
  if (patch.tts != null) lang.tts = patch.tts;
  touch();
}

export function deleteLanguage(id) {
  state.languages = state.languages.filter((l) => l.id !== id);
  state.folders = state.folders.filter((f) => f.languageId !== id);
  state.vocabs = state.vocabs.filter((v) => v.languageId !== id);
  state.tests = state.tests.filter((t) => t.languageId !== id);
  touch();
}

// ---------- Ordner ----------

function uniqueFolderName(languageId, wanted, exceptId = null) {
  const taken = new Set(
    foldersOf(languageId)
      .filter((f) => f.id !== exceptId)
      .map((f) => f.name.toLowerCase()),
  );
  if (!taken.has(wanted.toLowerCase())) return wanted;
  let i = 2;
  while (taken.has(`${wanted} (${i})`.toLowerCase())) i++;
  return `${wanted} (${i})`;
}

/** Ohne Namen heißt der Ordner wie das heutige Datum. */
export function addFolder(languageId, name) {
  const wanted = (name ?? '').trim() || formatDate(dayNumber());
  const folder = { id: uid(), languageId, name: uniqueFolderName(languageId, wanted), createdAt: Date.now() };
  state.folders.push(folder);
  touch();
  return folder;
}

export function renameFolder(id, name) {
  const folder = folderById(id);
  if (!folder) return;
  const wanted = name.trim();
  if (wanted) folder.name = uniqueFolderName(folder.languageId, wanted, id);
  touch();
}

export function deleteFolder(id) {
  state.folders = state.folders.filter((f) => f.id !== id);
  state.vocabs = state.vocabs.filter((v) => v.folderId !== id);
  state.tests = state.tests
    .map((t) => ({ ...t, folderIds: t.folderIds.filter((fid) => fid !== id) }))
    .filter((t) => t.folderIds.length > 0);
  touch();
}

// ---------- Vokabeln ----------

/** @returns {{status:'added'|'duplicate'|'empty', entry?:object}} */
export function addVocab(folderId, german, foreign) {
  const folder = folderById(folderId);
  const g = german.trim();
  const f = foreign.trim();
  if (!folder || !g || !f) return { status: 'empty' };
  const probe = { languageId: folder.languageId, german: g, foreign: f };
  const key = cardKey(probe);
  let sibling = null;
  for (const v of state.vocabs) {
    if (v.languageId !== folder.languageId || cardKey(v) !== key) continue;
    if (v.folderId === folderId) return { status: 'duplicate' };
    if (v.srs && !sibling) sibling = v;
  }
  const entry = { id: uid(), ...probe, folderId, createdAt: Date.now(), srs: sibling ? { ...sibling.srs } : null };
  state.vocabs.push(entry);
  touch();
  return { status: 'added', entry };
}

/** Fügt viele Paare auf einmal ein. @returns {{added:number, existing:number}} */
export function importPairs(folderId, pairs) {
  const folder = folderById(folderId);
  if (!folder) return { added: 0, existing: 0 };
  const inFolder = new Set();
  const progress = new Map();
  for (const v of state.vocabs) {
    if (v.languageId !== folder.languageId) continue;
    const key = cardKey(v);
    if (v.folderId === folderId) inFolder.add(key);
    if (v.srs && !progress.has(key)) progress.set(key, v.srs);
  }
  let added = 0;
  let existing = 0;
  const now = Date.now();
  for (const p of pairs) {
    const probe = { languageId: folder.languageId, german: p.german.trim(), foreign: p.foreign.trim() };
    if (!probe.german || !probe.foreign) continue;
    const key = cardKey(probe);
    if (inFolder.has(key)) {
      existing++;
      continue;
    }
    inFolder.add(key);
    const srs = progress.get(key);
    state.vocabs.push({ id: uid(), ...probe, folderId, createdAt: now - added, srs: srs ? { ...srs } : null });
    added++;
  }
  if (added) touch();
  return { added, existing };
}

/** @returns {{status:'ok'|'duplicate'|'empty'}} */
export function updateVocab(id, { german, foreign, folderId }) {
  const v = state.vocabs.find((x) => x.id === id);
  if (!v) return { status: 'empty' };
  const g = (german ?? v.german).trim();
  const f = (foreign ?? v.foreign).trim();
  if (!g || !f) return { status: 'empty' };
  const targetFolder = folderId ?? v.folderId;
  const folder = folderById(targetFolder);
  if (!folder || folder.languageId !== v.languageId) return { status: 'empty' };
  const key = cardKey({ languageId: v.languageId, german: g, foreign: f });
  const clash = state.vocabs.some((x) => x.id !== id && x.folderId === targetFolder && cardKey(x) === key);
  if (clash) return { status: 'duplicate' };
  v.german = g;
  v.foreign = f;
  v.folderId = targetFolder;
  touch();
  return { status: 'ok' };
}

export function deleteVocab(id) {
  state.vocabs = state.vocabs.filter((v) => v.id !== id);
  touch();
}

/** Setzt den Lernstand dieser Karte (in allen Ordnern) zurück. */
export function resetProgress(id) {
  const v = state.vocabs.find((x) => x.id === id);
  if (!v) return;
  const key = cardKey(v);
  for (const x of state.vocabs) if (cardKey(x) === key) x.srs = null;
  touch();
}

// ---------- Klassenarbeiten ----------

export function addTest({ title, languageId, folderIds, date }) {
  const test = { id: uid(), title: title.trim(), languageId, folderIds: [...folderIds], date, createdAt: Date.now(), lastExam: null };
  state.tests.push(test);
  touch();
  return test;
}

export function updateTest(id, patch) {
  const t = testById(id);
  if (!t) return;
  Object.assign(t, patch);
  touch();
}

export function deleteTest(id) {
  state.tests = state.tests.filter((t) => t.id !== id);
  touch();
}

/** Tag der nächsten Klassenarbeit, die diese Karte betrifft (oder null). */
export function nextTestDayFor(entries, today) {
  let best = null;
  for (const t of state.tests) {
    if (t.date < today) continue;
    if (!entries.some((e) => t.folderIds.includes(e.folderId))) continue;
    if (best == null || t.date < best) best = t.date;
  }
  return best;
}

// ---------- Lernen ----------

/**
 * Wendet eine Bewertung auf eine Karte an (und auf alle Dubletten).
 * Vor einer Klassenarbeit wird der nächste Termin höchstens auf den Tag davor gelegt.
 * @returns {boolean} true, wenn der Lernplan geändert wurde
 */
export function applyReview(key, rating, today = dayNumber()) {
  const entries = state.vocabs.filter((v) => cardKey(v) === key);
  if (!entries.length) return false;
  const group = groupCards(entries).get(key);
  if (!shouldApplyReview(group.srs, rating, today)) return false;
  let next = review(group.srs, rating, today);
  const testDay = nextTestDayFor(entries, today);
  if (testDay != null && next.due > testDay - 1) next = { ...next, due: Math.max(today + 1, testDay - 1) };
  for (const e of entries) e.srs = { ...next };
  touch();
  return true;
}

/** Zählt beantwortete Karten für Tagesziel und Streak. */
export function noteReviews(count = 1, today = dayNumber()) {
  const day = (state.days[today] ??= { r: 0, g: 0 });
  day.r += count;
  let goalJustMet = false;
  if (!day.g && day.r >= state.settings.dailyGoal) {
    day.g = 1;
    state.streak = recordGoalMet(state.streak, today);
    goalJustMet = true;
  }
  const oldest = today - 120;
  for (const k of Object.keys(state.days)) if (Number(k) < oldest) delete state.days[k];
  touch();
  return { goalJustMet, reviewsToday: day.r };
}

export function updateSettings(patch) {
  Object.assign(state.settings, patch);
  // Tagesziel gesenkt, heute schon erreicht -> Streak nachziehen
  const today = dayNumber();
  const day = state.days[today];
  if (day && !day.g && day.r >= state.settings.dailyGoal && day.r > 0) {
    day.g = 1;
    state.streak = recordGoalMet(state.streak, today);
  }
  touch();
}
