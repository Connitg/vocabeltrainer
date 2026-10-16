// Klassenarbeiten: Liste, Detailseite mit Lernplan, Anlegen/Bearbeiten.

import * as store from '../store.js';
import { h, icon, openSheet, confirmDialog, field, textInput, emptyState, pluralize } from '../ui.js';
import { navigate, goBack } from '../nav.js';
import { dayNumber, dayFromIso, isoDate, formatDate, relativeDays } from '../dates.js';
import { makeView, pageHead, statBar, startPractice, testStats } from './common.js';

function daysLabel(date, today) {
  const d = date - today;
  if (d < 0) return 'vorbei';
  if (d === 0) return 'heute';
  if (d === 1) return 'morgen';
  return `in ${d} Tagen`;
}

// ============================================================
// Liste
// ============================================================

export function testsView() {
  return makeView(() => {
    const s = store.get();
    const today = dayNumber();
    const frag = document.createDocumentFragment();
    frag.append(
      pageHead({
        title: 'Klassenarbeiten',
        sub: 'Plane deine Übung bis zum Termin',
        actions: s.tests.length ? [h('button.btn.btn-small.btn-primary', { type: 'button', onclick: () => openTestSheet() }, icon('plus', 18), 'Neu')] : [],
      }),
    );

    if (!s.tests.length) {
      frag.append(
        emptyState(
          'Noch keine Klassenarbeit',
          'Wähle die Ordner, die drankommen, und das Datum. Die App sagt dir, wie sicher du bist, und plant die Übung bis dahin.',
          h('button.btn.btn-primary', { type: 'button', onclick: () => openTestSheet() }, icon('plus', 20), 'Klassenarbeit anlegen'),
        ),
      );
      return frag;
    }

    const upcoming = s.tests.filter((t) => t.date >= today).sort((a, b) => a.date - b.date);
    const past = s.tests.filter((t) => t.date < today).sort((a, b) => b.date - a.date);

    for (const t of upcoming) frag.append(testRow(t, today));
    if (past.length) {
      frag.append(h('h2.section-title', 'Vergangen'));
      for (const t of past) frag.append(testRow(t, today, true));
    }
    return frag;
  });
}

function testRow(test, today, past = false) {
  const lang = store.languageById(test.languageId);
  const st = testStats(test, today);
  const pct = Math.round(st.readiness * 100);
  return h(
    'button.card.test-card',
    { type: 'button', class: past ? 'is-past' : '', onclick: () => navigate('test', { id: test.id }) },
    h('span.test-card-top', h('b', test.title), h('span.test-when', daysLabel(test.date, today))),
    h('span.test-card-mid', h('span.sub', `${lang?.name ?? ''} · ${formatDate(test.date)}`), past ? null : h('span.test-pct', `Bereit zu ${pct} %`)),
    past ? null : h('span.statbar.statbar-single', h('span.statbar-mature', { style: { width: `${pct}%` } })),
  );
}

// ============================================================
// Detailseite
// ============================================================

export function testView({ id }) {
  return makeView(() => {
    const test = store.testById(id);
    if (!test) {
      setTimeout(() => goBack({ name: 'tests', params: {} }), 0);
      return null;
    }
    const lang = store.languageById(test.languageId);
    const today = dayNumber();
    const st = testStats(test, today);
    const pct = Math.round(st.readiness * 100);
    const past = test.date < today;
    const folders = test.folderIds.map((fid) => store.folderById(fid)).filter(Boolean);
    const frag = document.createDocumentFragment();

    frag.append(
      pageHead({
        title: test.title,
        sub: `${lang?.name ?? ''} · ${formatDate(test.date)}`,
        back: { name: 'tests', params: {} },
        actions: [h('button.icon-btn', { type: 'button', 'aria-label': 'Klassenarbeit bearbeiten', onclick: () => openTestSheet(test) }, icon('more', 24))],
      }),
    );

    frag.append(
      h(
        'section.card.countdown',
        h('div.countdown-big', past ? h('span.countdown-num', 'Vorbei') : test.date === today ? h('span.countdown-num', 'Heute') : [h('span.countdown-num', String(test.date - today)), h('span.countdown-unit', test.date - today === 1 ? 'Tag' : 'Tage')]),
        h('p.sub', past ? `Die Klassenarbeit war ${relativeDays(test.date, today)}.` : `bis zur Klassenarbeit (${relativeDays(test.date, today)})`),
      ),
    );

    if (st.total === 0) {
      frag.append(emptyState('Keine Vokabeln in den Ordnern', 'Füge den ausgewählten Ordnern erst Vokabeln hinzu.'));
    } else {
      frag.append(
        h(
          'section.card',
          h('div.readiness-head', h('h2', 'Bereitschaft'), h('b.readiness-pct', `${pct} %`)),
          h('span.statbar.statbar-single.statbar-big', h('span.statbar-mature', { style: { width: `${pct}%` } })),
          h('p.hint', past ? 'So sicher sitzen die Vokabeln heute.' : 'So sicher sitzen die Vokabeln am Testtag, wenn du fällige Karten wie geplant wiederholst. Neue Vokabeln zählen noch nicht.'),
          statBar({ mature: st.mature, learning: st.learning, fresh: st.fresh, total: st.total }),
          h('p.sub', `${pluralize(st.total, 'Vokabel', 'Vokabeln')} · ${st.mature} sicher · ${st.learning} in Arbeit · ${st.fresh} neu`),
        ),
      );

      if (!past) {
        const plan = [];
        plan.push(st.due ? `${pluralize(st.due, 'Karte ist', 'Karten sind')} heute fällig.` : 'Heute ist nichts fällig.');
        if (st.fresh) plan.push(`${st.plan} neue Vokabeln pro Tag, dann ist bis zum Test alles einmal dran.`);
        frag.append(
          h(
            'section.card',
            h('h2', 'Plan für heute'),
            h('ul.plan', plan.map((p) => h('li', p))),
            h('button.btn.btn-primary.btn-block', { type: 'button', disabled: st.todayCount === 0, onclick: () => startPractice({ languageId: test.languageId, folderIds: test.folderIds }, { mode: 'due', label: test.title, newLimit: st.plan }) }, icon('play', 18), st.todayCount ? `Für den Test üben · ${st.todayCount}` : 'Für heute erledigt'),
            h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: () => startPractice({ languageId: test.languageId, folderIds: test.folderIds }, { mode: 'all', label: test.title }) }, 'Alles durchgehen'),
          ),
        );
      }

      frag.append(
        h(
          'section.card',
          h('h2', 'Probetest'),
          h('p.hint', 'Wie in der Schule: Du tippst alle Wörter ohne Hilfe, das Ergebnis siehst du am Ende mit Note.'),
          test.lastExam ? h('p.last-exam', `Letzter Versuch: ${test.lastExam.percent} % · Note ${test.lastExam.grade} (${formatDate(test.lastExam.day)})`) : null,
          h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: () => openExamSizeSheet(test, st.total) }, icon('exam', 20), 'Probetest starten'),
        ),
      );
    }

    frag.append(h('h2.section-title', 'Ordner'), h('div.chips.static', folders.map((f) => h('span.chip.static', icon('folder', 16), ` ${f.name}`))));
    return frag;
  });
}

function openExamSizeSheet(test, total) {
  const start = (count) => {
    navigate('exam', { scope: { languageId: test.languageId, folderIds: test.folderIds }, label: test.title, testId: test.id, count });
  };
  if (total <= 15) {
    start(total);
    return;
  }
  openSheet({
    title: 'Wie viele Vokabeln?',
    compact: true,
    content: (api) => {
      const options = [...new Set([15, 30, total].filter((n) => n <= total))];
      return h(
        'div.stack',
        options.map((n) =>
          h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: () => api.close().then(() => start(n)) }, n === total ? `Alle ${n} Vokabeln` : `${n} zufällige Vokabeln`),
        ),
      );
    },
  });
}

// ============================================================
// Anlegen / Bearbeiten
// ============================================================

export function openTestSheet(existing = null) {
  const s = store.get();
  const today = dayNumber();
  const usable = s.languages.filter((l) => store.foldersOf(l.id).some((f) => store.vocabsInFolder(f.id).length > 0 || existing));
  openSheet({
    title: existing ? 'Klassenarbeit bearbeiten' : 'Neue Klassenarbeit',
    content: (api) => {
      if (!usable.length && !existing) {
        return h('div.stack', h('p', 'Lege zuerst einen Ordner mit Vokabeln an. Dann kannst du hier auswählen, was in der Klassenarbeit drankommt.'), h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: () => api.close() }, 'Verstanden'));
      }
      let langId = existing?.languageId ?? usable[0].id;
      const selected = new Set(existing?.folderIds ?? []);
      const title = textInput({ value: existing?.title ?? '', placeholder: 'z. B. Englisch Unit 3', maxlength: '60', autocapitalize: 'sentences' });
      const date = h('input.input', { type: 'date', min: isoDate(today), value: isoDate(existing?.date ?? today + 7), 'aria-label': 'Datum' });
      const langSel = h('select.input', { 'aria-label': 'Sprache', disabled: !!existing, onchange: (e) => { langId = e.target.value; selected.clear(); renderFolders(); } }, usable.concat(existing ? s.languages.filter((l) => l.id === existing.languageId && !usable.includes(l)) : []).map((l) => h('option', { value: l.id, selected: l.id === langId }, `${l.flag} ${l.name}`)));
      const foldersBox = h('div.check-list');
      const msg = h('p.form-msg', { role: 'alert' });

      function renderFolders() {
        while (foldersBox.firstChild) foldersBox.removeChild(foldersBox.firstChild);
        const list = store.foldersOf(langId);
        if (!list.length) foldersBox.append(h('p.hint', 'In dieser Sprache gibt es noch keine Ordner.'));
        for (const f of list) {
          const n = store.vocabsInFolder(f.id).length;
          foldersBox.append(
            h(
              'label.check-row',
              h('input', { type: 'checkbox', checked: selected.has(f.id), onchange: (e) => { if (e.target.checked) selected.add(f.id); else selected.delete(f.id); } }),
              h('span.check-box', icon('check', 16)),
              h('span.check-text', f.name, h('span.sub', pluralize(n, 'Vokabel', 'Vokabeln'))),
            ),
          );
        }
      }
      renderFolders();

      const save = () => {
        const lang = store.languageById(langId);
        const ids = [...selected];
        const dayN = date.value ? dayFromIso(date.value) : NaN;
        if (!ids.length) {
          msg.textContent = 'Wähle mindestens einen Ordner aus.';
          return;
        }
        if (!Number.isFinite(dayN) || (!existing && dayN < today)) {
          msg.textContent = 'Bitte wähle ein Datum, das nicht in der Vergangenheit liegt.';
          return;
        }
        const name = title.value.trim() || `${lang?.name ?? 'Klassen'}arbeit`;
        if (existing) {
          store.updateTest(existing.id, { title: name, folderIds: ids, date: dayN });
          api.close();
        } else {
          const t = store.addTest({ title: name, languageId: langId, folderIds: ids, date: dayN });
          api.close().then(() => navigate('test', { id: t.id }));
        }
      };

      return h(
        'form.stack',
        { onsubmit: (e) => { e.preventDefault(); save(); } },
        field('Name', title),
        usable.length > 1 || existing ? field('Sprache', langSel) : null,
        h('div.field', h('span.field-label', 'Was kommt dran?'), foldersBox),
        field('Datum', date),
        msg,
        h('button.btn.btn-primary.btn-block', { type: 'submit' }, existing ? 'Speichern' : 'Klassenarbeit anlegen'),
        existing
          ? h(
              'button.btn.btn-danger-outline.btn-block',
              {
                type: 'button',
                onclick: async () => {
                  const ok = await confirmDialog({ title: 'Klassenarbeit löschen?', text: `„${existing.title}“ wird gelöscht. Deine Vokabeln bleiben erhalten.`, confirmLabel: 'Löschen', danger: true });
                  if (!ok) return;
                  await api.close();
                  store.deleteTest(existing.id); // die Detailseite erkennt das selbst und geht zurück
                },
              },
              icon('trash', 18),
              'Klassenarbeit löschen',
            )
          : null,
      );
    },
  });
}

