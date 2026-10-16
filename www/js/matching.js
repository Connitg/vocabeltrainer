// Prüft getippte Antworten: richtig, fast richtig (Tippfehler, Akzent, Artikel) oder falsch.

const ARTICLES = [
  'the', 'to', 'le', 'la', 'les', "l'", 'un', 'une', 'el', 'los', 'las', 'una', 'il', 'lo', 'gli',
  'der', 'die', 'das', 'ein', 'eine', 'het', 'een', 'de',
];

/** Kleinbuchstaben, einheitliche Apostrophe, ohne Satzzeichen, Leerzeichen zusammengefasst. */
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´ʼ]/g, "'")
    .replace(/[.,!?;:()"“”„«»…[\]{}]/g, ' ')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

/** Damerau-Levenshtein (ein vertauschter Nachbarbuchstabe zählt als 1 Fehler). */
export function editDistance(a, b) {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const d = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[al][bl];
}

/**
 * Zerlegt die Lösung in alle akzeptierten Antworten.
 * "chat / chatte" -> ["chat / chatte", "chat", "chatte"]
 * "(se) laver"    -> ["(se) laver", "laver"]
 */
export function acceptedAnswers(expected) {
  const text = String(expected ?? '').trim();
  const out = new Set();
  const add = (t) => {
    const v = t.trim();
    if (v) out.add(v);
  };
  add(text);
  const parts = text.split(/\s*[/;|]\s*/);
  for (const part of parts) {
    add(part);
    const withoutParens = part.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ');
    add(withoutParens);
  }
  return [...out];
}

function typoLimit(len) {
  if (len >= 10) return 2;
  if (len >= 4) return 1;
  return 0;
}

function stripArticle(norm) {
  for (const art of ARTICLES) {
    const prefix = art.endsWith("'") ? art : `${art} `;
    if (norm.startsWith(prefix) && norm.length > prefix.length) return norm.slice(prefix.length);
  }
  return null;
}

function compareOne(inputNorm, answer) {
  const target = normalize(answer);
  if (!target) return { result: 'wrong' };
  if (inputNorm === target) return { result: 'correct', answer };

  const inNoAcc = stripAccents(inputNorm);
  const tgNoAcc = stripAccents(target);
  if (inNoAcc === tgNoAcc) return { result: 'near', reason: 'accent', answer };

  const tgNoArt = stripArticle(target);
  if (tgNoArt !== null) {
    if (inputNorm === tgNoArt) return { result: 'near', reason: 'article', answer };
    if (inNoAcc === stripAccents(tgNoArt)) return { result: 'near', reason: 'article', answer };
  }
  const inNoArt = stripArticle(inputNorm);
  if (inNoArt !== null && (inNoArt === target || stripAccents(inNoArt) === tgNoAcc)) {
    return { result: 'near', reason: 'article', answer };
  }

  const limit = typoLimit(tgNoAcc.length);
  if (limit > 0 && editDistance(inNoAcc, tgNoAcc) <= limit) {
    return { result: 'near', reason: 'typo', answer };
  }
  return { result: 'wrong' };
}

const ORDER = { correct: 0, near: 1, wrong: 2 };

/**
 * @returns {{result:'correct'|'near'|'wrong', reason?:'accent'|'typo'|'article', answer:string}}
 *   `answer` ist die Schreibweise, die angezeigt werden soll.
 */
export function checkAnswer(input, expected) {
  const inputNorm = normalize(input);
  const display = String(expected ?? '').trim();
  if (!inputNorm) return { result: 'wrong', answer: display };
  let best = null;
  for (const alt of acceptedAnswers(expected)) {
    const r = compareOne(inputNorm, alt);
    if (!best || ORDER[r.result] < ORDER[best.result]) best = r;
    if (best.result === 'correct') break;
  }
  if (best.result === 'wrong') return { result: 'wrong', answer: display };
  return best;
}

/** Schlüssel, um doppelte Vokabeln zu erkennen. */
export function pairKey(german, foreign) {
  return `${normalize(german)}|${normalize(foreign)}`;
}
