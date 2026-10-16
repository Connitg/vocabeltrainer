// Lern-Warteschlange: Welche Vokabeln kommen in die nächste Runde, und in welcher Reihenfolge?
// Doppelte Vokabeln (gleiches Wortpaar in mehreren Ordnern) werden zu EINER Karte zusammengefasst.

import { pairKey } from './matching.js';
import { retrievabilityAt, RATING } from './fsrs.js';

export const ROUND_SIZE = 20;

/** Schlüssel für eine Vokabel (gleiche Sprache + gleiches Wortpaar = gleiche Karte). */
export function cardKey(v) {
  return `${v.languageId}|${pairKey(v.german, v.foreign)}`;
}

/**
 * Fasst Vokabeln zu Karten zusammen.
 * @returns {Map<string, {key:string, entries:object[], rep:object, srs:object|null}>}
 */
export function groupCards(vocabs) {
  const map = new Map();
  for (const v of vocabs) {
    const key = cardKey(v);
    let g = map.get(key);
    if (!g) {
      g = { key, entries: [], rep: v, srs: v.srs ?? null };
      map.set(key, g);
    }
    g.entries.push(v);
    // Der Eintrag mit dem meisten Lernfortschritt gilt für alle Dubletten.
    if (v.srs && (!g.srs || v.srs.reps > g.srs.reps || (v.srs.reps === g.srs.reps && v.srs.last > g.srs.last))) {
      g.srs = v.srs;
      g.rep = v;
    }
  }
  return map;
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Wie viele verschiedene Karten wurden heute zum ersten Mal gelernt? */
export function introducedToday(vocabs, languageId, today) {
  const keys = new Set();
  for (const v of vocabs) {
    if (v.languageId === languageId && v.srs && v.srs.first === today) keys.add(cardKey(v));
  }
  return keys.size;
}

/** Zahlen für Übersichten: neu / fällig / gesamt (doppelte nur einmal gezählt). */
export function countCards(vocabs, today) {
  const cards = [...groupCards(vocabs).values()];
  let fresh = 0;
  let due = 0;
  let learning = 0;
  let mature = 0;
  for (const c of cards) {
    if (!c.srs) fresh++;
    else {
      if (c.srs.due <= today) due++;
      if (c.srs.stability >= 21) mature++;
      else learning++;
    }
  }
  return { total: cards.length, fresh, due, learning, mature };
}

/**
 * Baut eine Runde.
 * @param {object[]} vocabs   Vokabeln im gewählten Bereich (ein Ordner, mehrere Ordner oder ganze Sprache)
 * @param {object} o
 * @param {number} o.today
 * @param {'due'|'all'} o.mode  'due' = fällige + begrenzt viele neue, 'all' = alles durchgehen
 * @param {number} [o.newLimit] wie viele neue Karten dürfen dazukommen (nur bei 'due')
 * @param {number} [o.roundSize]
 * @param {Set<string>} [o.exclude] Karten, die in diesem Durchgang schon dran waren
 * @param {() => number} [o.rng]
 * @returns {{key:string, isNew:boolean}[]}
 */
export function buildRound(vocabs, { today, mode = 'due', newLimit = Infinity, roundSize = ROUND_SIZE, exclude = new Set(), rng = Math.random }) {
  const cards = [...groupCards(vocabs).values()].filter((c) => !exclude.has(c.key));
  const isDue = (c) => c.srs && c.srs.due <= today;

  const due = cards
    .filter(isDue)
    .sort((a, b) => a.srs.due - b.srs.due || retrievabilityAt(a.srs, today) - retrievabilityAt(b.srs, today));
  const fresh = shuffle(cards.filter((c) => !c.srs), rng);

  let picked;
  if (mode === 'all') {
    const rest = cards
      .filter((c) => c.srs && !isDue(c))
      .sort((a, b) => retrievabilityAt(a.srs, today) - retrievabilityAt(b.srs, today));
    picked = [...due, ...rest, ...fresh].slice(0, roundSize);
  } else {
    const dueSlice = due.slice(0, roundSize);
    const room = Math.max(0, roundSize - dueSlice.length);
    picked = [...dueSlice, ...fresh.slice(0, Math.min(room, newLimit))];
  }
  return shuffle(picked, rng).map((c) => ({ key: c.key, isNew: !c.srs }));
}

/** Gibt es nach dieser Runde noch etwas zu tun? */
export function hasMoreWork(vocabs, opts) {
  return buildRound(vocabs, { ...opts, roundSize: 1 }).length > 0;
}

/**
 * Darf die Bewertung den Lernplan verändern?
 * Neue und fällige Karten: ja. Vorzeitig geübte Karten: nur, wenn man sie vergessen hat.
 */
export function shouldApplyReview(srs, rating, today) {
  if (!srs) return true;
  if (srs.due <= today) return true;
  return rating === RATING.AGAIN;
}

/**
 * Lernmodus für die nächste Karte, wenn "Auto" gewählt ist:
 * junge Karten als Karteikarte, sichere Karten werden getippt.
 */
export function pickAutoMode(srs) {
  if (srs && srs.stability >= 4) return 'type';
  return 'flash';
}

/**
 * Warteschlange einer laufenden Runde. Falsche Karten kommen nach ein paar anderen noch einmal.
 */
export class RoundQueue {
  constructor(items) {
    this.items = items.map((i) => ({ ...i, phase: i.isNew ? 'intro' : 'ask', graded: false }));
    this.total = items.length;
    this.finished = 0;
  }

  get current() {
    return this.items[0] ?? null;
  }

  get remaining() {
    return this.items.length;
  }

  /** Neue Karte wurde angeschaut -> später abfragen. */
  introDone() {
    const item = this.items.shift();
    item.phase = 'ask';
    this.items.splice(Math.min(3, this.items.length), 0, item);
  }

  /**
   * @param {number} rating 1-4
   * @returns {{firstAttempt:boolean}} firstAttempt = diese Bewertung zählt für den Lernplan
   */
  answer(rating) {
    const item = this.items.shift();
    const firstAttempt = !item.graded;
    item.graded = true;
    if (rating === RATING.AGAIN) {
      this.items.splice(Math.min(3, this.items.length), 0, item);
    } else {
      this.finished++;
    }
    return { firstAttempt };
  }
}
