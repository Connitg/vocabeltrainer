// Gemeinsame Bausteine für mehrere Bildschirme.

import * as store from '../store.js';
import { h, icon, openSheet, field, textInput } from '../ui.js';
import { goBack, navigate } from '../nav.js';
import { dayNumber } from '../dates.js';
import { countCards, groupCards, introducedToday } from '../session.js';
import { readiness, newPerDay } from '../testprep.js';
import { LANGUAGE_PRESETS, TTS_OPTIONS, FLAG_CHOICES } from '../presets.js';

/** Baut einen Bildschirm, dessen Inhalt bei Änderungen neu aufgebaut wird (Bildlauf bleibt erhalten). */
export function makeView(build, { cls = 'page' } = {}) {
  const root = h('div', { class: cls });
  const rebuild = () => {
    while (root.firstChild) root.removeChild(root.firstChild);
    const content = build();
    if (content) root.append(content);
  };
  rebuild();
  return { el: root, refresh: rebuild };
}

export function backButton(fallback) {
  return h('button.icon-btn.back-btn', { type: 'button', 'aria-label': 'Zurück', onclick: () => goBack(fallback) }, icon('chevronLeft', 24));
}

export function pageHead({ title, sub, back, actions = [] }) {
  return h(
    'header.page-head',
    back ? backButton(back) : null,
    h('div.page-head-text', h('h1', title), sub ? h('p.sub', sub) : null),
    actions.length ? h('div.page-head-actions', actions) : null,
  );
}

/** Dreiteiliger Balken: sicher / lernend / neu. */
export function statBar({ mature, learning, fresh, total }) {
  const pct = (n) => (total ? (n / total) * 100 : 0);
  return h(
    'div.statbar',
    { role: 'img', 'aria-label': `${mature} sicher, ${learning} in Arbeit, ${fresh} neu` },
    h('span.statbar-mature', { style: { width: `${pct(mature)}%` } }),
    h('span.statbar-learning', { style: { width: `${pct(learning)}%` } }),
  );
}

export function flagBadge(lang, size = 'md') {
  return h('span.flag', { class: `flag-${size}`, 'aria-hidden': 'true' }, lang.flag || '🌍');
}

/** Wie viele neue Karten darf dieser Bereich heute noch dazubekommen? */
export function newAllowedToday(scopeVocabs, limit = null) {
  const s = store.get();
  const cap = limit ?? s.settings.newPerDay;
  const langId = scopeVocabs[0]?.languageId;
  return Math.max(0, cap - (langId ? introducedToday(scopeVocabs, langId, dayNumber()) : 0));
}

/** Zahlen für Übungs-Knöpfe: fällig + erlaubte neue Karten. */
export function practiceInfo(vocabs, limit = null) {
  const today = dayNumber();
  const c = countCards(vocabs, today);
  const allowedNew = newAllowedToday(vocabs, limit);
  const newToday = Math.min(c.fresh, allowedNew);
  return { ...c, newToday, todayCount: c.due + newToday };
}

export function startPractice(scope, { mode = 'due', label = '', newLimit = null } = {}) {
  navigate('learn', { scope, mode, label, newLimit });
}

/** Wie gut ist eine Klassenarbeit vorbereitet? */
export function testStats(test, today = dayNumber()) {
  const vocabs = store.vocabsForScope({ languageId: test.languageId, folderIds: test.folderIds });
  const cards = [...groupCards(vocabs).values()];
  const c = countCards(vocabs, today);
  const plan = newPerDay(c.fresh, test.date, today);
  const info = practiceInfo(vocabs, plan);
  return {
    vocabs,
    total: c.total,
    fresh: c.fresh,
    due: c.due,
    mature: c.mature,
    learning: c.learning,
    plan,
    todayCount: info.todayCount,
    newToday: info.newToday,
    readiness: readiness(cards.map((x) => x.srs), test.date, today),
  };
}

/** Pop-up zum Anlegen einer Sprache. */
export function openLanguageSheet({ onCreated } = {}) {
  return openSheet({
    title: 'Sprache hinzufügen',
    content: (api) => {
      let flag = '🌍';
      const name = textInput({ placeholder: 'z. B. Spanisch', maxlength: '40', autocapitalize: 'words' });
      const tts = h(
        'select.input',
        { 'aria-label': 'Sprache zum Vorlesen' },
        TTS_OPTIONS.map((o) => h('option', { value: o.code }, o.label)),
      );
      const flagButtons = FLAG_CHOICES.map((f) =>
        h('button.flag-choice', { type: 'button', 'aria-pressed': String(f === flag), onclick: () => pickFlag(f) }, f),
      );
      const msg = h('p.form-msg', { role: 'alert' });
      function pickFlag(f) {
        flag = f;
        flagButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === f)));
      }
      const chips = LANGUAGE_PRESETS.map((p) =>
        h(
          'button.chip',
          {
            type: 'button',
            onclick: () => {
              name.value = p.name;
              tts.value = p.tts;
              pickFlag(p.flag);
            },
          },
          h('span', p.flag),
          ` ${p.name}`,
        ),
      );
      const create = () => {
        const n = name.value.trim();
        if (!n) {
          msg.textContent = 'Bitte gib einen Namen ein.';
          name.focus();
          return;
        }
        if (store.get().languages.some((l) => l.name.toLowerCase() === n.toLowerCase())) {
          msg.textContent = 'Diese Sprache gibt es schon.';
          return;
        }
        const lang = store.addLanguage({ name: n, flag, tts: tts.value });
        api.close().then(() => onCreated?.(lang));
      };
      return h(
        'form.stack',
        { onsubmit: (e) => { e.preventDefault(); create(); } },
        h('p.hint', 'Tippe auf einen Vorschlag oder gib selbst einen Namen ein.'),
        h('div.chips', chips),
        field('Name', name),
        h('div.field', h('span.field-label', 'Symbol'), h('div.flag-choices', flagButtons)),
        field('Vorlesen', tts, 'Das Handy liest die Wörter mit dieser Stimme vor. Für manche Sprachen (z. B. Latein) gibt es keine Stimme.'),
        msg,
        h('button.btn.btn-primary.btn-block', { type: 'submit' }, 'Sprache anlegen'),
      );
    },
  });
}

/** Häufige Sonderzeichen je Sprache (zum Antippen unter dem Eingabefeld). */
export const SPECIAL_CHARS = {
  fr: ['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ô', 'û', 'ù', 'ë', 'ï', 'œ', '’'],
  es: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'],
  it: ['à', 'è', 'é', 'ì', 'ò', 'ù'],
  pt: ['á', 'à', 'â', 'ã', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç'],
  tr: ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü', 'İ'],
  pl: ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'],
  nl: ['ë', 'ï', 'é'],
  en: ['’'],
};

export function specialCharsFor(ttsCode) {
  const key = (ttsCode || '').slice(0, 2).toLowerCase();
  return SPECIAL_CHARS[key] ?? [];
}
