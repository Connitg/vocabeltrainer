// Startseite "Heute": Streak, Tagesziel, Übungs-Knöpfe pro Sprache, anstehende Klassenarbeiten.

import * as store from '../store.js';
import { h, icon, pluralize } from '../ui.js';
import { navigate } from '../nav.js';
import { dayNumber, weekdayIndex, WEEKDAYS_SHORT, relativeDays, formatDate } from '../dates.js';
import { currentStreak } from '../streak.js';
import { countCards } from '../session.js';
import { LANGUAGE_PRESETS } from '../presets.js';
import { makeView, statBar, flagBadge, practiceInfo, startPractice, testStats, openLanguageSheet } from './common.js';

function todayLabel() {
  try {
    return new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return formatDate(dayNumber());
  }
}

function streakChip(streak) {
  const state = streak.count === 0 ? 'none' : streak.doneToday ? 'done' : 'risk';
  const label =
    streak.count === 0
      ? 'Noch keine Serie'
      : `${pluralize(streak.count, 'Tag', 'Tage')} in Folge${streak.doneToday ? '' : ', heute noch offen'}`;
  return h('div.streak-chip', { class: `streak-${state}`, role: 'img', 'aria-label': label }, icon('flame', 20), h('b', String(streak.count)));
}

function goalRing(done, goal) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, goal ? done / goal : 0);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 72 72');
  svg.setAttribute('class', 'ring');
  svg.setAttribute('aria-hidden', 'true');
  const track = document.createElementNS(ns, 'circle');
  const bar = document.createElementNS(ns, 'circle');
  for (const el of [track, bar]) {
    el.setAttribute('cx', '36');
    el.setAttribute('cy', '36');
    el.setAttribute('r', String(r));
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke-width', '7');
  }
  track.setAttribute('class', 'ring-track');
  bar.setAttribute('class', 'ring-bar');
  bar.setAttribute('stroke-linecap', 'round');
  bar.setAttribute('stroke-dasharray', `${c}`);
  bar.setAttribute('stroke-dashoffset', `${c * (1 - frac)}`);
  bar.setAttribute('transform', 'rotate(-90 36 36)');
  svg.append(track, bar);
  return svg;
}

function weekDots(s, today) {
  const monday = today - weekdayIndex(today);
  const dots = WEEKDAYS_SHORT.map((label, i) => {
    const day = monday + i;
    const d = s.days[day];
    const cls = d?.g ? 'met' : d?.r ? 'part' : '';
    return h(
      'li.week-dot',
      { class: [cls, day === today ? 'today' : '', day > today ? 'future' : ''] },
      h('span.week-dot-mark', d?.g ? icon('check', 14) : null),
      h('span.week-dot-label', label),
    );
  });
  return h('ol.week', { 'aria-label': 'Diese Woche' }, dots);
}

function welcome() {
  const chips = LANGUAGE_PRESETS.slice(0, 8).map((p) =>
    h(
      'button.chip',
      {
        type: 'button',
        onclick: () => {
          const lang = store.addLanguage({ name: p.name, flag: p.flag, tts: p.tts });
          navigate('lang', { id: lang.id });
        },
      },
      h('span', p.flag),
      ` ${p.name}`,
    ),
  );
  return h(
    'section.card.welcome',
    h('h2', 'Willkommen bei LearnApp'),
    h('p', 'Hier lernst du Vokabeln so, dass sie hängen bleiben: Die App fragt dich genau dann ab, wenn du sie fast vergessen hättest.'),
    h('p.hint', 'Fang an: Welche Sprache lernst du?'),
    h('div.chips', chips),
    h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: () => openLanguageSheet({ onCreated: (l) => navigate('lang', { id: l.id }) }) }, icon('plus', 20), 'Andere Sprache'),
  );
}

function goalCard(s, today) {
  const done = s.days[today]?.r ?? 0;
  const goal = s.settings.dailyGoal;
  const met = done >= goal;
  return h(
    'section.card.goal',
    h('div.goal-top', goalRing(done, goal), h('div.goal-text', h('h2', met ? 'Tagesziel geschafft' : 'Tagesziel'), h('p', `${done} von ${goal} Karten`), met ? h('p.ok', 'Jede weitere Karte hilft trotzdem.') : null)),
    weekDots(s, today),
  );
}

function languageCard(lang, today) {
  const vocabs = store.vocabsInLanguage(lang.id);
  const c = countCards(vocabs, today);
  const info = practiceInfo(vocabs);
  const sub =
    c.total === 0
      ? 'Noch keine Vokabeln'
      : info.todayCount > 0
        ? `${info.due} fällig · ${info.newToday} neu`
        : `${c.total} Vokabeln · heute alles erledigt`;

  let button;
  if (c.total === 0) {
    button = h('button.btn.btn-secondary', { type: 'button', onclick: () => navigate('lang', { id: lang.id }) }, 'Vokabeln hinzufügen');
  } else if (info.todayCount > 0) {
    button = h('button.btn.btn-primary', { type: 'button', onclick: () => startPractice({ languageId: lang.id, folderIds: null }, { mode: 'due', label: lang.name }) }, icon('play', 18), `Üben · ${info.todayCount}`);
  } else {
    button = h('button.btn.btn-secondary', { type: 'button', onclick: () => startPractice({ languageId: lang.id, folderIds: null }, { mode: 'all', label: lang.name }) }, 'Trotzdem üben');
  }

  return h(
    'section.card.lang-card',
    h(
      'button.lang-card-head',
      { type: 'button', onclick: () => navigate('lang', { id: lang.id }), 'aria-label': `${lang.name} öffnen` },
      flagBadge(lang, 'lg'),
      h('span.lang-card-name', h('b', lang.name), h('span.sub', sub)),
      icon('chevronRight', 20),
    ),
    statBar({ ...c }),
    h('div.lang-card-foot', h('span.sub', c.total ? `${c.mature} sicher · ${c.learning} in Arbeit · ${c.fresh} neu` : ''), button),
  );
}

function testCard(test, today) {
  const st = testStats(test, today);
  const lang = store.languageById(test.languageId);
  return h(
    'button.card.test-card',
    { type: 'button', onclick: () => navigate('test', { id: test.id }) },
    h('span.test-card-top', h('b', test.title), h('span.test-when', relativeDays(test.date, today))),
    h('span.test-card-mid', h('span.sub', `${lang?.name ?? ''} · ${formatDate(test.date)}`), h('span.test-pct', `Bereit zu ${Math.round(st.readiness * 100)} %`)),
    h('span.statbar.statbar-single', h('span.statbar-mature', { style: { width: `${Math.round(st.readiness * 100)}%` } })),
  );
}

export function homeView() {
  return makeView(() => {
    const s = store.get();
    const today = dayNumber();
    const streak = currentStreak(s.streak, today);
    const frag = document.createDocumentFragment();
    frag.append(h('header.home-head', h('div', h('h1', 'Heute'), h('p.sub', todayLabel())), streakChip(streak)));

    if (!s.languages.length) {
      frag.append(welcome());
      return frag;
    }

    frag.append(goalCard(s, today));
    for (const lang of s.languages) frag.append(languageCard(lang, today));

    const upcoming = s.tests
      .filter((t) => t.date >= today)
      .sort((a, b) => a.date - b.date)
      .slice(0, 2);
    if (upcoming.length) {
      frag.append(h('h2.section-title', 'Klassenarbeiten'));
      for (const t of upcoming) frag.append(testCard(t, today));
    }
    return frag;
  });
}
