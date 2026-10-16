// Einstellungen: Lernen, Erinnerung, Daten (Backup), Über die App.

import * as store from '../store.js';
import { h, icon, toast, confirmDialog, openSheet, stepper, toggle, segmented, pluralize } from '../ui.js';
import { isNative, remindersSupported, sendTestReminder, exportTextFile } from '../native.js';
import { refreshReminders } from '../reminder-sync.js';
import { currentStreak } from '../streak.js';
import { dayNumber, isoDate } from '../dates.js';
import { makeView, pageHead } from './common.js';

export const APP_VERSION = '1.0.0';

function row(title, desc, control, { stack = false } = {}) {
  return h('div.setting-row', { class: stack ? 'stack' : '' }, h('div.setting-text', h('b', title), desc ? h('span.sub', desc) : null), control);
}

function group(title, ...rows) {
  return h('section.card.settings-group', h('h2', title), ...rows);
}

// Der Hinweistext überlebt das Neuaufbauen der Seite (jede Einstellung baut sie neu auf).
let reminderMsg = '';

function setReminderMsg(text) {
  reminderMsg = text;
  const el = document.getElementById('reminder-status');
  if (el) el.textContent = text;
}

async function remindersChanged() {
  const res = await refreshReminders();
  if (res.ok) setReminderMsg('');
  else if (res.reason === 'permission') setReminderMsg('Benachrichtigungen sind für diese App ausgeschaltet. Erlaube sie in den Android-Einstellungen unter Apps → LearnApp → Benachrichtigungen.');
  else if (res.reason === 'unsupported') setReminderMsg('Erinnerungen funktionieren nur in der installierten App, nicht im Browser.');
  else setReminderMsg('Die Erinnerung konnte nicht eingerichtet werden.');
  return res;
}

export function settingsView() {
  return makeView(() => {
    const s = store.get();
    const set = s.settings;
    const today = dayNumber();
    const streak = currentStreak(s.streak, today);
    const frag = document.createDocumentFragment();
    frag.append(pageHead({ title: 'Einstellungen' }));

    // ----- Lernen -----
    frag.append(
      group(
        'Lernen',
        row('Tagesziel', 'So viele Karten pro Tag halten deine Serie am Leben.', stepper({ value: set.dailyGoal, min: 5, max: 100, step: 5, label: 'Tagesziel', onChange: (v) => store.updateSettings({ dailyGoal: v }) })),
        row('Neue Vokabeln pro Tag', 'Pro Sprache. Weniger ist oft mehr.', stepper({ value: set.newPerDay, min: 0, max: 50, step: 5, label: 'Neue Vokabeln', onChange: (v) => store.updateSettings({ newPerDay: v }) })),
        row(
          'Karteikarten',
          'Tippen und Handschrift fragen immer das Fremdwort ab.',
          segmented(
            [
              { value: 'de-fo', label: 'DE → Fremd' },
              { value: 'fo-de', label: 'Fremd → DE' },
              { value: 'mixed', label: 'Gemischt' },
            ],
            set.cardDirection,
            (v) => store.updateSettings({ cardDirection: v }),
            'Richtung der Karteikarten',
          ),
          { stack: true },
        ),
        row('Automatisch vorlesen', 'Das Fremdwort wird beim Aufdecken vorgelesen.', toggle(set.autoSpeak, (v) => store.updateSettings({ autoSpeak: v }), 'Automatisch vorlesen')),
      ),
    );

    // ----- Erinnerung -----
    const status = h('p.form-msg.warn#reminder-status', { role: 'status' }, reminderMsg);
    const timeInput = h('input.input.time-input', {
      type: 'time',
      value: set.reminderTime,
      'aria-label': 'Uhrzeit der Erinnerung',
      onchange: async (e) => {
        if (!e.target.value) return;
        store.updateSettings({ reminderTime: e.target.value });
        await remindersChanged();
      },
    });
    frag.append(
      group(
        'Erinnerung',
        row(
          'Tägliche Erinnerung',
          isNative() ? 'Eine Benachrichtigung zur gewählten Uhrzeit.' : 'Funktioniert nur in der installierten Android-App.',
          toggle(set.reminderOn, async (v) => {
            store.updateSettings({ reminderOn: v });
            const res = await remindersChanged();
            if (v && !res.ok && res.reason === 'permission') {
              store.updateSettings({ reminderOn: false });
              toast('Erlaube Benachrichtigungen, damit die Erinnerung klappt.');
            }
          }, 'Tägliche Erinnerung'),
        ),
        row('Uhrzeit', 'Zum Beispiel nach der Schule.', timeInput),
        row('Nicht nerven, wenn ich fertig bin', 'Hast du dein Tagesziel erreicht, kommt heute keine Erinnerung.', toggle(set.skipIfDone, async (v) => { store.updateSettings({ skipIfDone: v }); await remindersChanged(); }, 'Nicht erinnern, wenn Tagesziel erreicht')),
        remindersSupported()
          ? h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: async () => {
              const r = await sendTestReminder();
              toast(r.ok ? 'Test-Erinnerung kommt in 5 Sekunden.' : r.reason === 'permission' ? 'Benachrichtigungen sind nicht erlaubt.' : 'Das hat nicht geklappt.');
            } }, icon('bell', 20), 'Test-Erinnerung in 5 Sekunden')
          : null,
        status,
      ),
    );

    // ----- Streak -----
    frag.append(
      group(
        'Serie',
        h('p.streak-info', icon('flame', 22), h('span', streak.count ? `Aktuell: ${pluralize(streak.count, 'Tag', 'Tage')} in Folge.` : 'Erreiche dein Tagesziel, um eine Serie zu starten.')),
        h('p.hint', 'Schonfrist: Ein verpasster Tag pro Woche (Montag bis Sonntag) zerstört deine Serie nicht.'),
      ),
    );

    // ----- Daten -----
    const fileInput = h('input', {
      type: 'file',
      accept: '.json,application/json',
      hidden: true,
      onchange: async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const text = await file.text();
        const parsed = store.parseBackup(text);
        if (!parsed.ok) {
          toast(parsed.error);
          return;
        }
        const c = parsed.counts;
        const ok = await confirmDialog({
          title: 'Backup laden?',
          text: `Die Sicherung enthält ${pluralize(c.languages, 'Sprache', 'Sprachen')}, ${pluralize(c.folders, 'Ordner', 'Ordner')} und ${pluralize(c.vocabs, 'Vokabel', 'Vokabeln')}. Alles, was jetzt in der App ist, wird ersetzt.`,
          confirmLabel: 'Ersetzen',
          danger: true,
        });
        if (!ok) return;
        store.replaceAll(parsed.state);
        await store.flush();
        toast('Backup geladen.');
      },
    });
    frag.append(
      group(
        'Daten',
        h('p.hint', 'Alle Daten bleiben auf deinem Gerät. Mit einem Backup kannst du sie sichern oder auf ein neues Handy mitnehmen.'),
        h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: async () => {
          const ok = await exportTextFile(`learnapp-backup-${isoDate(today)}.json`, store.exportJson());
          if (ok) toast(isNative() ? 'Wähle aus, wohin das Backup soll.' : 'Backup heruntergeladen.');
        } }, icon('download', 20), 'Backup speichern'),
        h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: () => fileInput.click() }, icon('upload', 20), 'Backup laden'),
        fileInput,
        h('button.btn.btn-danger-outline.btn-block', { type: 'button', onclick: async () => {
          const ok = await confirmDialog({ title: 'Alles löschen?', text: 'Alle Sprachen, Ordner, Vokabeln, Klassenarbeiten und dein Lernstand werden gelöscht. Das lässt sich nicht rückgängig machen. Speichere vorher ein Backup, wenn du unsicher bist.', confirmLabel: 'Alles löschen', danger: true });
          if (!ok) return;
          await store.resetAll();
          await refreshReminders();
          toast('Alle Daten wurden gelöscht.');
        } }, icon('trash', 20), 'Alle Daten löschen'),
      ),
    );

    // ----- Über -----
    frag.append(
      group(
        'Über LearnApp',
        h('p', `Version ${APP_VERSION}`),
        h('p.hint', 'Ohne Konto, ohne Werbung, ohne Tracking. Die App speichert alles nur auf deinem Gerät.'),
        h('a.btn.btn-ghost.btn-block', { href: 'datenschutz.html' }, 'Datenschutzerklärung'),
        h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: openHowItWorks }, 'So funktioniert das Lernen'),
      ),
    );
    return frag;
  });
}

function openHowItWorks() {
  openSheet({
    title: 'So funktioniert das Lernen',
    content: () =>
      h(
        'div.stack.prose',
        h('p', 'LearnApp fragt dich eine Vokabel genau dann ab, wenn du sie fast vergessen hättest. Das ist der effektivste Zeitpunkt, um sie dir langfristig zu merken (Spaced Repetition mit dem Algorithmus FSRS).'),
        h('p', 'Neue Vokabeln siehst du erst als Karteikarte. Sitzen sie besser, musst du sie tippen. Wer ein Wort tippt, statt es nur zu erkennen, behält es länger.'),
        h('p', 'Richtig geantwortet? Dann kommt die Vokabel erst nach mehreren Tagen wieder, danach nach Wochen. Falsch? Dann schon morgen.'),
        h('p', 'Vor einer Klassenarbeit plant die App die Wiederholungen so, dass alles rechtzeitig noch einmal dran ist.'),
      ),
  });
}
