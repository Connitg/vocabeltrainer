// Wandelt eingefügten Text (z. B. aus Quizlet, Excel oder dem Vokabelheft) in Vokabelpaare um.
// Pro Zeile ein Paar. Erkannte Trennzeichen (in dieser Reihenfolge):
//   Tabulator, " - " (auch – und —), " = ", ";", "|", ":", ",", "-" (genau einmal in der Zeile)

const unquote = (s) => s.trim().replace(/^["„“']+|["“”']+$/g, '').trim();

function splitLine(line) {
  const tab = line.indexOf('\t');
  if (tab > -1) return [line.slice(0, tab), line.slice(tab + 1).split('\t')[0]];

  const spaced = line.match(/^(.*?)\s+[-–—]\s+(.*)$/);
  if (spaced) return [spaced[1], spaced[2]];

  const eq = line.match(/^(.*?)\s+=\s+(.*)$/);
  if (eq) return [eq[1], eq[2]];

  for (const sep of [';', '|', '=', ':', ',', '-']) {
    const parts = line.split(sep);
    if (parts.length === 2) return parts;
  }
  return null;
}

/**
 * @param {string} text
 * @param {{swap?: boolean}} [opts] swap = erste Spalte ist die Fremdsprache
 * @returns {{pairs: {german:string, foreign:string}[], skipped: string[], duplicates: number}}
 */
export function parsePairs(text, opts = {}) {
  const pairs = [];
  const skipped = [];
  const seen = new Set();
  let duplicates = 0;

  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = splitLine(line);
    if (!parts) {
      skipped.push(line);
      continue;
    }
    let [a, b] = parts.map(unquote);
    if (opts.swap) [a, b] = [b, a];
    if (!a || !b) {
      skipped.push(line);
      continue;
    }
    const key = `${a.toLowerCase()}|${b.toLowerCase()}`;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    pairs.push({ german: a, foreign: b });
  }
  return { pairs, skipped, duplicates };
}
