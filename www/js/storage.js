// Speichert den Lernstand. Auf dem Handy doppelt (Preferences + localStorage), im Browser nur localStorage.

import { getPlugin } from './native.js';

const KEY = 'learnapp.state.v1';

function readLocal() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function writeLocal(text) {
  try {
    localStorage.setItem(KEY, text);
    return true;
  } catch {
    return false;
  }
}

function savedAt(text) {
  try {
    return JSON.parse(text)?.savedAt ?? 0;
  } catch {
    return -1; // kaputt
  }
}

export async function loadState() {
  const local = readLocal();
  const prefs = getPlugin('Preferences');
  let native = null;
  if (prefs) {
    try {
      native = (await prefs.get({ key: KEY }))?.value ?? null;
    } catch {
      native = null;
    }
  }
  const candidates = [local, native].filter((t) => t && savedAt(t) >= 0);
  if (!candidates.length) return null;
  candidates.sort((a, b) => savedAt(b) - savedAt(a));
  return candidates[0];
}

export async function saveState(text) {
  const okLocal = writeLocal(text);
  const prefs = getPlugin('Preferences');
  if (prefs) {
    try {
      await prefs.set({ key: KEY, value: text });
      return true;
    } catch {
      /* fällt auf localStorage zurück */
    }
  }
  return okLocal;
}

export async function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorieren */
  }
  const prefs = getPlugin('Preferences');
  if (prefs) {
    try {
      await prefs.remove({ key: KEY });
    } catch {
      /* ignorieren */
    }
  }
}
