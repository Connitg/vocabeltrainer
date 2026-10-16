// Startpunkt der App: Daten laden, Navigation starten, Bildschirm anzeigen.

import * as store from './store.js';
import { startRouter, onRoute, currentRoute, switchTab } from './nav.js';
import { h, clear, icon } from './ui.js';
import { refreshReminders } from './reminder-sync.js';
import { homeView } from './views/home.js';
import { vocabView, langView, folderView } from './views/vocab.js';
import { learnView, examView } from './views/learn.js';
import { testsView, testView } from './views/tests.js';
import { settingsView } from './views/settings.js';

const VIEWS = {
  home: homeView,
  vocab: vocabView,
  lang: langView,
  folder: folderView,
  learn: learnView,
  exam: examView,
  tests: testsView,
  test: testView,
  settings: settingsView,
};

const TAB_OF = { home: 'home', vocab: 'vocab', lang: 'vocab', folder: 'vocab', tests: 'tests', test: 'tests', settings: 'settings' };
const FULLSCREEN = new Set(['learn', 'exam']);
const TAB_DEFS = [
  { name: 'home', label: 'Heute', icon: 'today' },
  { name: 'vocab', label: 'Vokabeln', icon: 'books' },
  { name: 'tests', label: 'Tests', icon: 'exam' },
  { name: 'settings', label: 'Mehr', icon: 'settings' },
];

let mounted = null;
const scrollMemory = new Map();

const routeKey = (r) => JSON.stringify(r);

function mount(route, kind) {
  const screen = document.getElementById('screen');
  if (mounted) {
    scrollMemory.set(mounted.key, screen.scrollTop);
    mounted.view.destroy?.();
  }
  const factory = VIEWS[route.name] ?? VIEWS.home;
  const view = factory(route.params ?? {});
  const key = routeKey(route);
  mounted = { key, view };
  clear(screen).appendChild(view.el);
  screen.scrollTop = kind === 'pop' ? (scrollMemory.get(key) ?? 0) : 0;
  updateChrome(route);
  document.title = 'LearnApp – Vokabeltrainer';
}

function updateChrome(route) {
  const app = document.getElementById('app');
  app.classList.toggle('fullscreen', FULLSCREEN.has(route.name));
  const active = TAB_OF[route.name];
  document.querySelectorAll('#tabbar .tab').forEach((b) => {
    if (b.dataset.tab === active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
}

function buildTabbar() {
  const bar = document.getElementById('tabbar');
  clear(bar);
  for (const t of TAB_DEFS) {
    bar.appendChild(
      h('button.tab', { type: 'button', 'data-tab': t.name, onclick: () => switchTab(t.name) }, icon(t.icon, 24), h('span', t.label)),
    );
  }
}

function watchKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  const update = () => {
    const open = vv.height < window.innerHeight * 0.75;
    document.body.classList.toggle('keyboard-open', open);
  };
  vv.addEventListener('resize', update);
  update();
}

async function boot() {
  await store.init();
  buildTabbar();
  watchKeyboard();

  onRoute((route, kind) => mount(route, kind));
  store.subscribe(() => {
    if (!mounted) return;
    if (mounted.view.refresh) mounted.view.refresh();
    else mount(currentRoute(), 'refresh');
  });

  startRouter({ name: 'home', params: {} });

  if (store.get().settings.reminderOn) refreshReminders();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && store.get().settings.reminderOn) refreshReminders();
  });
}

boot().catch((err) => {
  console.error(err);
  const screen = document.getElementById('screen');
  clear(screen).appendChild(
    h(
      'div.page',
      h('h1', 'Hoppla'),
      h('p', 'Die App konnte nicht gestartet werden. Schließe sie und öffne sie noch einmal.'),
      h('pre.error', String(err?.stack ?? err)),
    ),
  );
});
