// Vokabeln-Bereich: Sprachen, Ordner, Wortlisten, Hinzufügen, Importieren, Bearbeiten.

import * as store from '../store.js';
import { h, icon, openSheet, confirmDialog, toast, field, textInput, emptyState, pluralize } from '../ui.js';
import { navigate, goBack } from '../nav.js';
import { dayNumber, relativeDays } from '../dates.js';
import { countCards } from '../session.js';
import { maturity } from '../fsrs.js';
import { parsePairs } from '../importer.js';
import { speak, canSpeak } from '../native.js';
import { TTS_OPTIONS, FLAG_CHOICES } from '../presets.js';
import { makeView, pageHead, statBar, flagBadge, practiceInfo, startPractice, openLanguageSheet } from './common.js';

// ============================================================
// Registerkarte "Vokabeln": alle Sprachen
// ============================================================

export function vocabView() {
  return makeView(() => {
    const s = store.get();
    const today = dayNumber();
    const frag = document.createDocumentFragment();
    frag.append(
      pageHead({
        title: 'Vokabeln',
        sub: s.languages.length ? 'Deine Sprachen und Ordner' : 'Lege deine erste Sprache an',
      }),
    );
    if (!s.languages.length) {
      frag.append(
        emptyState(
          'Noch keine Sprache',
          'Eine Sprache enthält Ordner (z. B. „Unit 3“), und die Ordner enthalten deine Vokabeln.',
          h('button.btn.btn-primary', { type: 'button', onclick: () => openLanguageSheet({ onCreated: (l) => navigate('lang', { id: l.id }) }) }, icon('plus', 20), 'Sprache hinzufügen'),
        ),
      );
      return frag;
    }
    for (const lang of s.languages) {
      const c = countCards(store.vocabsInLanguage(lang.id), today);
      const folders = store.foldersOf(lang.id).length;
      frag.append(
        h(
          'button.card.row-card',
          { type: 'button', onclick: () => navigate('lang', { id: lang.id }) },
          flagBadge(lang, 'lg'),
          h('span.row-card-text', h('b', lang.name), h('span.sub', `${pluralize(c.total, 'Vokabel', 'Vokabeln')} · ${pluralize(folders, 'Ordner', 'Ordner')}`)),
          icon('chevronRight', 20),
        ),
      );
    }
    frag.append(h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: () => openLanguageSheet({ onCreated: (l) => navigate('lang', { id: l.id }) }) }, icon('plus', 20), 'Sprache hinzufügen'));
    return frag;
  });
}

// ============================================================
// Eine Sprache: Üben + Ordnerliste
// ============================================================

export function langView({ id }) {
  return makeView(() => {
    const lang = store.languageById(id);
    if (!lang) {
      setTimeout(() => goBack({ name: 'vocab', params: {} }), 0);
      return null;
    }
    const today = dayNumber();
    const vocabs = store.vocabsInLanguage(id);
    const c = countCards(vocabs, today);
    const info = practiceInfo(vocabs);
    const folders = store.foldersOf(id);
    const frag = document.createDocumentFragment();

    frag.append(
      pageHead({
        title: lang.name,
        sub: `${pluralize(c.total, 'Vokabel', 'Vokabeln')} in ${pluralize(folders.length, 'Ordner', 'Ordnern')}`,
        back: { name: 'vocab', params: {} },
        actions: [h('button.icon-btn', { type: 'button', 'aria-label': 'Sprache bearbeiten', onclick: () => openLanguageMenu(lang) }, icon('more', 24))],
      }),
    );

    if (c.total > 0) {
      frag.append(
        h(
          'section.card.practice-card',
          h('div.practice-numbers', numberBlock(info.due, 'fällig'), numberBlock(info.newToday, 'neu heute'), numberBlock(c.mature, 'sicher')),
          statBar({ ...c }),
          h(
            'div.btn-row',
            h('button.btn.btn-primary', { type: 'button', disabled: info.todayCount === 0, onclick: () => startPractice({ languageId: id, folderIds: null }, { mode: 'due', label: lang.name }) }, icon('play', 18), info.todayCount ? `Üben · ${info.todayCount}` : 'Nichts fällig'),
            h('button.btn.btn-secondary', { type: 'button', onclick: () => startPractice({ languageId: id, folderIds: null }, { mode: 'all', label: lang.name }) }, 'Alles üben'),
          ),
          h('p.hint', 'Beim gemeinsamen Üben wird jede Vokabel nur einmal abgefragt, auch wenn sie in mehreren Ordnern steht.'),
        ),
      );
    }

    frag.append(
      h(
        'div.section-row',
        h('h2.section-title', 'Ordner'),
        h('button.btn.btn-small.btn-secondary', { type: 'button', onclick: () => openNewFolderSheet(lang) }, icon('plus', 18), 'Neuer Ordner'),
      ),
    );

    if (!folders.length) {
      frag.append(emptyState('Noch kein Ordner', 'Lege einen Ordner an, zum Beispiel für eine Unit oder ein Thema. Ohne Namen heißt er wie das heutige Datum.'));
    } else {
      for (const f of [...folders].sort((a, b) => b.createdAt - a.createdAt)) {
        const fv = store.vocabsInFolder(f.id);
        const fc = countCards(fv, today);
        frag.append(
          h(
            'button.card.row-card',
            { type: 'button', onclick: () => navigate('folder', { id: f.id }) },
            h('span.folder-icon', icon('folder', 26)),
            h('span.row-card-text', h('b', f.name), h('span.sub', `${pluralize(fc.total, 'Vokabel', 'Vokabeln')}${fc.due ? ` · ${fc.due} fällig` : ''}`)),
            icon('chevronRight', 20),
          ),
        );
      }
    }
    return frag;
  });
}

function numberBlock(n, label) {
  return h('div.number-block', h('b', String(n)), h('span', label));
}

function openNewFolderSheet(lang) {
  openSheet({
    title: 'Neuer Ordner',
    content: (api) => {
      const name = textInput({ placeholder: 'Name, z. B. Unit 3 (leer = heutiges Datum)', maxlength: '60', autocapitalize: 'sentences' });
      return h(
        'form.stack',
        {
          onsubmit: (e) => {
            e.preventDefault();
            const folder = store.addFolder(lang.id, name.value);
            api.close().then(() => navigate('folder', { id: folder.id }));
          },
        },
        field('Name', name, 'Ohne Namen heißt der Ordner wie das heutige Datum.'),
        h('button.btn.btn-primary.btn-block', { type: 'submit' }, 'Ordner anlegen'),
      );
    },
  });
}

function openLanguageMenu(lang) {
  openSheet({
    title: `${lang.name} bearbeiten`,
    content: (api) => {
      let flag = lang.flag;
      const name = textInput({ value: lang.name, maxlength: '40', autocapitalize: 'words' });
      const tts = h('select.input', { 'aria-label': 'Sprache zum Vorlesen' }, TTS_OPTIONS.map((o) => h('option', { value: o.code, selected: o.code === lang.tts }, o.label)));
      const choices = FLAG_CHOICES.includes(flag) ? FLAG_CHOICES : [flag, ...FLAG_CHOICES];
      const flagButtons = choices.map((f) => h('button.flag-choice', { type: 'button', 'aria-pressed': String(f === flag), onclick: () => { flag = f; flagButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === f))); } }, f));
      return h(
        'form.stack',
        {
          onsubmit: (e) => {
            e.preventDefault();
            store.updateLanguage(lang.id, { name: name.value, flag, tts: tts.value });
            api.close();
          },
        },
        field('Name', name),
        h('div.field', h('span.field-label', 'Symbol'), h('div.flag-choices', flagButtons)),
        field('Vorlesen', tts),
        h('button.btn.btn-primary.btn-block', { type: 'submit' }, 'Speichern'),
        h(
          'button.btn.btn-danger-outline.btn-block',
          {
            type: 'button',
            onclick: async () => {
              const v = store.vocabsInLanguage(lang.id).length;
              const ok = await confirmDialog({
                title: `${lang.name} löschen?`,
                text: `Alle Ordner, ${pluralize(v, 'Vokabel', 'Vokabeln')} und Klassenarbeiten dieser Sprache werden gelöscht. Das lässt sich nicht rückgängig machen.`,
                confirmLabel: 'Löschen',
                danger: true,
              });
              if (!ok) return;
              await api.close();
              store.deleteLanguage(lang.id); // die Sprach-Seite erkennt das selbst und geht zurück
            },
          },
          icon('trash', 18),
          'Sprache löschen',
        ),
      );
    },
  });
}

// ============================================================
// Ein Ordner: Üben + Wortliste im "Vokabelheft"-Stil
// ============================================================

const PAGE_SIZE = 150;

export function folderView({ id }) {
  let query = '';
  let limit = PAGE_SIZE;
  let listEl = null;
  let lastLanguageId = null;

  const view = makeView(() => {
    const folder = store.folderById(id);
    if (!folder) {
      const fallback = lastLanguageId && store.languageById(lastLanguageId) ? { name: 'lang', params: { id: lastLanguageId } } : { name: 'vocab', params: {} };
      setTimeout(() => goBack(fallback), 0);
      return null;
    }
    lastLanguageId = folder.languageId;
    const lang = store.languageById(folder.languageId);
    const vocabs = store.vocabsInFolder(id);
    const info = practiceInfo(vocabs);
    const frag = document.createDocumentFragment();

    frag.append(
      pageHead({
        title: folder.name,
        sub: `${lang?.name ?? ''} · ${pluralize(vocabs.length, 'Vokabel', 'Vokabeln')}`,
        back: { name: 'lang', params: { id: folder.languageId } },
        actions: [h('button.icon-btn', { type: 'button', 'aria-label': 'Ordner bearbeiten', onclick: () => openFolderMenu(folder) }, icon('more', 24))],
      }),
    );

    if (vocabs.length) {
      const c = countCards(vocabs, dayNumber());
      frag.append(
        h(
          'section.card.practice-card',
          h('div.practice-numbers', numberBlock(info.due, 'fällig'), numberBlock(info.newToday, 'neu heute'), numberBlock(c.mature, 'sicher')),
          statBar({ ...c }),
          h(
            'div.btn-row',
            h('button.btn.btn-primary', { type: 'button', disabled: info.todayCount === 0, onclick: () => startPractice({ languageId: folder.languageId, folderIds: [id] }, { mode: 'due', label: folder.name }) }, icon('play', 18), info.todayCount ? `Üben · ${info.todayCount}` : 'Nichts fällig'),
            h('button.btn.btn-secondary', { type: 'button', onclick: () => startPractice({ languageId: folder.languageId, folderIds: [id] }, { mode: 'all', label: folder.name }) }, 'Alles üben'),
          ),
        ),
      );
    }

    frag.append(
      h(
        'div.btn-row.add-row',
        h('button.btn.btn-primary', { type: 'button', onclick: () => openAddSheet(folder) }, icon('plus', 20), 'Vokabel'),
        h('button.btn.btn-secondary', { type: 'button', onclick: () => openImportSheet(folder) }, icon('upload', 20), 'Liste einfügen'),
      ),
    );

    if (!vocabs.length) {
      frag.append(emptyState('Dieser Ordner ist leer', 'Füge Vokabeln einzeln hinzu oder kopiere eine ganze Liste hinein, zum Beispiel aus Quizlet oder deinem Vokabelheft.'));
      return frag;
    }

    const search = h('input.input.search', {
      type: 'search',
      placeholder: 'Suchen',
      'aria-label': 'Vokabeln suchen',
      value: query,
      autocomplete: 'off',
      oninput: (e) => {
        query = e.target.value;
        limit = PAGE_SIZE;
        renderList();
      },
    });
    frag.append(h('div.search-wrap', icon('search', 20), search));
    listEl = h('div.vh');
    frag.append(listEl);
    renderList();
    return frag;
  });

  function renderList() {
    if (!listEl) return;
    const folder = store.folderById(id);
    if (!folder) return;
    const lang = store.languageById(folder.languageId);
    const q = query.trim().toLowerCase();
    const all = store.vocabsInFolder(id).sort((a, b) => b.createdAt - a.createdAt);
    const filtered = q ? all.filter((v) => v.german.toLowerCase().includes(q) || v.foreign.toLowerCase().includes(q)) : all;
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    if (!filtered.length) {
      listEl.append(h('p.empty-line', 'Nichts gefunden.'));
      return;
    }
    listEl.append(h('div.vh-head', h('span', 'Deutsch'), h('span', lang?.name ?? 'Fremdsprache')));
    const visible = filtered.slice(0, limit);
    for (const v of visible) listEl.append(vocabRow(v, lang));
    if (filtered.length > visible.length) {
      listEl.append(
        h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: () => { limit += PAGE_SIZE; renderList(); } }, `Mehr anzeigen (${filtered.length - visible.length})`),
      );
    }
  }

  return view;
}

function vocabRow(v, lang) {
  const m = maturity(v.srs);
  const speakBtn =
    lang?.tts && canSpeak()
      ? h('button.icon-btn.vh-speak', { type: 'button', 'aria-label': `${v.foreign} vorlesen`, onclick: () => speak(v.foreign, lang.tts) }, icon('volume', 20))
      : null;
  return h(
    'div.vh-row',
    h(
      'button.vh-main',
      { type: 'button', onclick: () => openEditSheet(v.id), 'aria-label': `${v.german} – ${v.foreign} bearbeiten` },
      h('span.dot', { class: `dot-${m}`, title: m }),
      h('span.vh-de', v.german),
      h('span.vh-fo', { lang: lang?.tts ? lang.tts.slice(0, 2) : null }, v.foreign),
    ),
    speakBtn,
  );
}

// ---------- Ordner-Menü ----------

function openFolderMenu(folder) {
  openSheet({
    title: 'Ordner bearbeiten',
    content: (api) => {
      const name = textInput({ value: folder.name, maxlength: '60', autocapitalize: 'sentences' });
      return h(
        'form.stack',
        {
          onsubmit: (e) => {
            e.preventDefault();
            store.renameFolder(folder.id, name.value);
            api.close();
          },
        },
        field('Name', name),
        h('button.btn.btn-primary.btn-block', { type: 'submit' }, 'Speichern'),
        h(
          'button.btn.btn-danger-outline.btn-block',
          {
            type: 'button',
            onclick: async () => {
              const n = store.vocabsInFolder(folder.id).length;
              const ok = await confirmDialog({
                title: `„${folder.name}“ löschen?`,
                text: n ? `Die ${pluralize(n, 'Vokabel', 'Vokabeln')} in diesem Ordner werden mitgelöscht. Das lässt sich nicht rückgängig machen.` : 'Der leere Ordner wird gelöscht.',
                confirmLabel: 'Löschen',
                danger: true,
              });
              if (!ok) return;
              await api.close();
              store.deleteFolder(folder.id); // die Ordner-Seite erkennt das selbst und geht zurück
            },
          },
          icon('trash', 18),
          'Ordner löschen',
        ),
      );
    },
  });
}

// ---------- Vokabel hinzufügen ----------

function openAddSheet(folder) {
  const lang = store.languageById(folder.languageId);
  openSheet({
    title: 'Vokabel hinzufügen',
    content: (api) => {
      const de = textInput({ placeholder: 'Deutsch', 'aria-label': 'Deutsch', lang: 'de', enterkeyhint: 'next', autocapitalize: 'sentences' });
      const fo = textInput({ placeholder: lang?.name ?? 'Fremdsprache', 'aria-label': lang?.name ?? 'Fremdsprache', lang: lang?.tts ? lang.tts.slice(0, 2) : null, enterkeyhint: 'done' });
      const msg = h('p.form-msg', { role: 'status' });
      let added = 0;
      const save = () => {
        const r = store.addVocab(folder.id, de.value, fo.value);
        if (r.status === 'added') {
          added++;
          msg.className = 'form-msg ok';
          msg.textContent = `„${de.value.trim()}“ gespeichert (${added} in dieser Runde)`;
          de.value = '';
          fo.value = '';
          de.focus();
        } else if (r.status === 'duplicate') {
          msg.className = 'form-msg warn';
          msg.textContent = 'Dieses Wortpaar gibt es in diesem Ordner schon.';
        } else {
          msg.className = 'form-msg warn';
          msg.textContent = 'Bitte fülle beide Felder aus.';
          (de.value.trim() ? fo : de).focus();
        }
      };
      de.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          fo.focus();
        }
      });
      fo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          save();
        }
      });
      return h(
        'div.stack',
        field('Deutsch', de),
        field(lang?.name ?? 'Fremdsprache', fo, 'Mehrere richtige Antworten trennst du mit /  (z. B. chat / chatte).'),
        msg,
        h('button.btn.btn-primary.btn-block', { type: 'button', onclick: save }, 'Speichern & weiter'),
        h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: () => api.close() }, 'Fertig'),
      );
    },
  });
}

// ---------- Liste einfügen ----------

function openImportSheet(folder) {
  const lang = store.languageById(folder.languageId);
  openSheet({
    title: 'Liste einfügen',
    content: (api) => {
      let swap = false;
      const area = h('textarea.input.area', {
        rows: '7',
        placeholder: 'Haus - maison\nBaum - arbre\nBuch - livre',
        'aria-label': 'Vokabelliste',
        spellcheck: 'false',
        autocapitalize: 'off',
        oninput: update,
      });
      const preview = h('div.import-preview');
      const importBtn = h('button.btn.btn-primary.btn-block', { type: 'button', disabled: true }, 'Importieren');
      const orderSeg = h(
        'div.seg',
        { role: 'group', 'aria-label': 'Reihenfolge der Spalten' },
        [
          { v: false, label: `Deutsch zuerst` },
          { v: true, label: `${lang?.name ?? 'Fremdsprache'} zuerst` },
        ].map((o) => {
          const b = h('button.seg-btn', { type: 'button', 'aria-pressed': String(o.v === swap), onclick: () => { swap = o.v; segButtons.forEach((x, i) => x.setAttribute('aria-pressed', String((i === 1) === swap))); update(); } }, o.label);
          return b;
        }),
      );
      const segButtons = [...orderSeg.children];
      let parsed = { pairs: [], skipped: [], duplicates: 0 };

      function update() {
        parsed = parsePairs(area.value, { swap });
        while (preview.firstChild) preview.removeChild(preview.firstChild);
        const { pairs, skipped, duplicates } = parsed;
        if (!area.value.trim()) {
          importBtn.disabled = true;
          importBtn.textContent = 'Importieren';
          return;
        }
        importBtn.disabled = pairs.length === 0;
        importBtn.textContent = pairs.length ? `${pluralize(pairs.length, 'Vokabel', 'Vokabeln')} importieren` : 'Nichts erkannt';
        if (pairs.length) {
          preview.append(h('p.ok-line', `${pluralize(pairs.length, 'Paar', 'Paare')} erkannt. So sieht es aus:`));
          const list = h('ul.preview-list');
          for (const p of pairs.slice(0, 4)) list.append(h('li', h('span', p.german), icon('chevronRight', 14), h('b', p.foreign)));
          if (pairs.length > 4) list.append(h('li.more', `… und ${pairs.length - 4} weitere`));
          preview.append(list);
        }
        if (duplicates) preview.append(h('p.warn-line', `${pluralize(duplicates, 'doppelte Zeile', 'doppelte Zeilen')} im Text werden nur einmal importiert.`));
        if (skipped.length) {
          preview.append(
            h('p.warn-line', `${pluralize(skipped.length, 'Zeile', 'Zeilen')} nicht erkannt und übersprungen:`),
            h('ul.skipped-list', skipped.slice(0, 3).map((s) => h('li', s)), skipped.length > 3 ? h('li', `… und ${skipped.length - 3} weitere`) : null),
          );
        }
      }

      importBtn.addEventListener('click', () => {
        const r = store.importPairs(folder.id, parsed.pairs);
        api.close().then(() => {
          let text = `${pluralize(r.added, 'Vokabel', 'Vokabeln')} importiert`;
          if (r.existing) text += `, ${r.existing} gab es schon`;
          toast(text);
        });
      });

      return h(
        'div.stack',
        h('p.hint', 'Pro Zeile ein Wortpaar. Getrennt durch Tabulator, „ - “, „ = “, Semikolon oder Komma. Quizlet-Listen und Tabellen aus Excel funktionieren direkt.'),
        area,
        h('div.field', h('span.field-label', 'Welche Spalte steht vorne?'), orderSeg),
        preview,
        importBtn,
      );
    },
  });
}

// ---------- Vokabel bearbeiten ----------

function openEditSheet(vocabId) {
  const v = store.get().vocabs.find((x) => x.id === vocabId);
  if (!v) return;
  const lang = store.languageById(v.languageId);
  const folders = store.foldersOf(v.languageId);
  openSheet({
    title: 'Vokabel bearbeiten',
    content: (api) => {
      const de = textInput({ value: v.german, lang: 'de', autocapitalize: 'sentences' });
      const fo = textInput({ value: v.foreign, lang: lang?.tts ? lang.tts.slice(0, 2) : null });
      const folderSel = h('select.input', { 'aria-label': 'Ordner' }, folders.map((f) => h('option', { value: f.id, selected: f.id === v.folderId }, f.name)));
      const msg = h('p.form-msg', { role: 'alert' });
      const today = dayNumber();
      const status = v.srs
        ? `${maturity(v.srs) === 'sicher' ? 'Sicher' : 'In Arbeit'} · nächste Wiederholung ${relativeDays(v.srs.due, today)}`
        : 'Noch nicht gelernt';
      const save = () => {
        const r = store.updateVocab(v.id, { german: de.value, foreign: fo.value, folderId: folderSel.value });
        if (r.status === 'ok') api.close();
        else {
          msg.className = 'form-msg warn';
          msg.textContent = r.status === 'duplicate' ? 'Dieses Wortpaar gibt es im Ordner schon.' : 'Bitte fülle beide Felder aus.';
        }
      };
      return h(
        'form.stack',
        { onsubmit: (e) => { e.preventDefault(); save(); } },
        field('Deutsch', de),
        field(lang?.name ?? 'Fremdsprache', fo, 'Mehrere richtige Antworten trennst du mit /'),
        folders.length > 1 ? field('Ordner', folderSel) : null,
        h('p.status-line', icon('clock', 16), status),
        msg,
        h('button.btn.btn-primary.btn-block', { type: 'submit' }, 'Speichern'),
        v.srs
          ? h(
              'button.btn.btn-secondary.btn-block',
              {
                type: 'button',
                onclick: async () => {
                  const ok = await confirmDialog({ title: 'Lernstand zurücksetzen?', text: 'Die Vokabel gilt danach wieder als neu.', confirmLabel: 'Zurücksetzen' });
                  if (!ok) return;
                  store.resetProgress(v.id);
                  toast('Lernstand zurückgesetzt');
                  api.close();
                },
              },
              icon('rotate', 18),
              'Lernstand zurücksetzen',
            )
          : null,
        h(
          'button.btn.btn-danger-outline.btn-block',
          {
            type: 'button',
            onclick: async () => {
              const ok = await confirmDialog({ title: 'Vokabel löschen?', text: `„${v.german} – ${v.foreign}“ wird gelöscht.`, confirmLabel: 'Löschen', danger: true });
              if (!ok) return;
              await api.close();
              store.deleteVocab(v.id);
            },
          },
          icon('trash', 18),
          'Vokabel löschen',
        ),
      );
    },
  });
}
