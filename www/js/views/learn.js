// Lernen: Runden mit Karteikarte / Tippen / Handschrift (Auto wählt passend) und der Probetest.

import * as store from '../store.js';
import { h, icon, clear, toast, confirmDialog, segmented, textInput } from '../ui.js';
import { goBack, replaceRoute } from '../nav.js';
import { dayNumber, formatDate } from '../dates.js';
import { buildRound, RoundQueue, cardKey, groupCards, pickAutoMode, hasMoreWork, introducedToday, shuffle } from '../session.js';
import { previewIntervals, formatInterval, RATING } from '../fsrs.js';
import { checkAnswer } from '../matching.js';
import { speak, canSpeak } from '../native.js';
import { currentStreak } from '../streak.js';
import { refreshReminders } from '../reminder-sync.js';
import { gradeFor, GRADE_SCALE } from '../testprep.js';
import { specialCharsFor } from './common.js';

// ---------- gemeinsame Helfer ----------

function cardInfo(key) {
  const entries = store.get().vocabs.filter((v) => cardKey(v) === key);
  const g = groupCards(entries).get(key);
  return g ? { german: g.rep.german, foreign: g.rep.foreign, srs: g.srs } : null;
}

const langAttr = (lang) => (lang?.tts ? lang.tts.slice(0, 2) : null);

function speakButton(lang, text) {
  if (!lang?.tts || !canSpeak()) return null;
  return h(
    'button.icon-btn.speak-btn',
    {
      type: 'button',
      'aria-label': `${text} vorlesen`,
      onclick: (e) => {
        e.stopPropagation();
        if (!speak(text, lang.tts)) toast('Vorlesen ist auf diesem Gerät gerade nicht möglich.');
      },
    },
    icon('volume', 22),
  );
}

function specialsRow(input, chars) {
  if (!chars.length) return null;
  return h(
    'div.specials',
    { 'aria-label': 'Sonderzeichen' },
    chars.map((ch) =>
      h(
        'button.special',
        {
          type: 'button',
          onpointerdown: (e) => e.preventDefault(),
          onclick: () => {
            const s = input.selectionStart ?? input.value.length;
            const e = input.selectionEnd ?? s;
            input.setRangeText(ch, s, e, 'end');
            input.focus();
          },
        },
        ch,
      ),
    ),
  );
}

function createDrawPad() {
  const canvas = h('canvas.pad', { role: 'img', 'aria-label': 'Schreibfläche. Schreibe mit Finger oder Stift.' });
  let ctx = null;
  let drawing = false;
  let ink = false;
  let last = null;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#20408f';
    ctx.fillStyle = '#20408f';
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (!ctx) resize();
    if (!ctx) return;
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* nicht überall verfügbar */
    }
    drawing = true;
    ink = true;
    last = pos(e);
    ctx.beginPath();
    ctx.arc(last.x, last.y, 1.7, 0, Math.PI * 2);
    ctx.fill();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  });
  const end = () => {
    drawing = false;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);
  return {
    el: canvas,
    resize,
    clear() {
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      ink = false;
    },
    get ink() {
      return ink;
    },
  };
}

const RATING_LABELS = { 1: 'Nochmal', 2: 'Schwer', 3: 'Gut', 4: 'Leicht' };

// ============================================================
// Lernrunde
// ============================================================

export function learnView(params) {
  const { scope, mode = 'due', label = '', newLimit = null } = params;
  const lang = store.languageById(scope.languageId);
  const root = h('div.learn');
  if (!lang) {
    setTimeout(() => goBack(), 0);
    return { el: root };
  }

  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };
  const cancelTimers = () => {
    timers.forEach(clearTimeout);
    timers.clear();
  };

  let queue = null;
  let round = { answered: 0, correct: 0, newLearned: 0, goalMet: false };
  const doneKeys = new Set();
  let manualMode = store.get().settings.mode;

  const bar = h('span.learn-progress-bar');
  const counter = h('span.learn-counter', '');
  const modeSeg = segmented(
    [
      { value: 'auto', label: 'Auto' },
      { value: 'flash', label: 'Karte' },
      { value: 'type', label: 'Tippen' },
      { value: 'draw', label: 'Hand' },
    ],
    manualMode,
    (v) => {
      manualMode = v;
      store.updateSettings({ mode: v });
      const cur = queue?.current;
      if (cur && cur.phase === 'ask') {
        cur.mode = null;
        show();
      }
    },
    'Lernmodus',
  );
  const modeRow = h('div.learn-modes', modeSeg);
  const body = h('div.learn-body');

  root.append(
    h(
      'header.learn-top',
      h('button.icon-btn', { type: 'button', 'aria-label': 'Runde beenden', onclick: () => goBack() }, icon('x', 24)),
      h('div.learn-progress', { role: 'progressbar', 'aria-label': label || 'Fortschritt' }, bar),
      counter,
    ),
    modeRow,
    body,
  );

  const newCap = (vocabs, today) =>
    mode === 'all' ? Infinity : Math.max(0, (newLimit ?? store.get().settings.newPerDay) - introducedToday(vocabs, scope.languageId, today));

  function startRound() {
    const vocabs = store.vocabsForScope(scope);
    const today = dayNumber();
    const items = buildRound(vocabs, { today, mode, newLimit: newCap(vocabs, today), exclude: doneKeys });
    if (!items.length) return showEmpty();
    items.forEach((i) => doneKeys.add(i.key));
    queue = new RoundQueue(items);
    round = { answered: 0, correct: 0, newLearned: 0, goalMet: false };
    show();
  }

  function updateProgress() {
    const done = queue.finished;
    bar.style.width = `${queue.total ? (done / queue.total) * 100 : 0}%`;
    counter.textContent = `${done} / ${queue.total}`;
  }

  function show() {
    cancelTimers();
    clear(body);
    if (!queue.current) return showSummary();
    updateProgress();
    const item = queue.current;
    const info = cardInfo(item.key);
    if (!info) {
      queue.items.shift();
      return show();
    }
    modeRow.hidden = item.phase === 'intro';
    if (item.phase === 'intro') return showIntro(info);
    item.mode ??= manualMode === 'auto' ? pickAutoMode(info.srs) : manualMode;
    if (item.mode === 'type') return showType(item, info);
    if (item.mode === 'draw') return showDraw(item, info);
    return showFlash(item, info);
  }

  function answer(rating) {
    const item = queue.current;
    const { firstAttempt } = queue.answer(rating);
    if (firstAttempt) {
      const today = dayNumber();
      store.applyReview(item.key, rating, today);
      const r = store.noteReviews(1, today);
      round.goalMet = round.goalMet || r.goalJustMet;
      round.answered++;
      if (rating >= RATING.GOOD) round.correct++;
      if (item.isNew) round.newLearned++;
    }
    show();
  }

  function ratingButtons(item, info, labels = RATING_LABELS) {
    const today = dayNumber();
    const wrap = h('div.rate-row');
    if (item.graded) {
      wrap.classList.add('two');
      wrap.append(
        h('button.rate.rate-1', { type: 'button', onclick: () => answer(RATING.AGAIN) }, h('b', 'Nochmal')),
        h('button.rate.rate-3', { type: 'button', onclick: () => answer(RATING.GOOD) }, h('b', 'Gewusst')),
      );
      return wrap;
    }
    const showIntervals = !info.srs || info.srs.due <= today;
    const iv = showIntervals ? previewIntervals(info.srs, today) : null;
    for (const g of Object.keys(labels).map(Number)) {
      wrap.append(h(`button.rate.rate-${g}`, { type: 'button', onclick: () => answer(g) }, h('b', labels[g]), iv ? h('span', formatInterval(iv[g])) : null));
    }
    return wrap;
  }

  // ---------- neue Vokabel zeigen ----------

  function showIntro(info) {
    body.append(
      h(
        'div.index-card.intro-card',
        h('p.card-label', 'Neue Vokabel'),
        h('p.word', { lang: 'de' }, info.german),
        h('div.card-rule'),
        h('p.word.ink', { lang: langAttr(lang) }, info.foreign),
        speakButton(lang, info.foreign),
      ),
      h('p.hint.center', 'Lies das Wort, sprich es laut und präg es dir ein. Gleich wirst du danach gefragt.'),
      h(
        'button.btn.btn-primary.btn-block.btn-lg',
        {
          type: 'button',
          onclick: () => {
            queue.introDone();
            show();
          },
        },
        'Weiter',
      ),
    );
    if (store.get().settings.autoSpeak) speak(info.foreign, lang.tts);
  }

  // ---------- Karteikarte ----------

  function showFlash(item, info) {
    const dirSetting = store.get().settings.cardDirection;
    item.dir ??= dirSetting === 'mixed' ? (Math.random() < 0.5 ? 'de-fo' : 'fo-de') : dirSetting;
    const deFront = item.dir === 'de-fo';
    const frontText = deFront ? info.german : info.foreign;
    const backText = deFront ? info.foreign : info.german;
    let revealed = false;
    const actions = h('div.learn-actions');

    const reveal = () => {
      if (revealed) return;
      revealed = true;
      card.classList.add('is-flipped');
      front.setAttribute('aria-hidden', 'true');
      back.removeAttribute('aria-hidden');
      clear(actions);
      actions.append(ratingButtons(item, info));
      if (store.get().settings.autoSpeak) speak(info.foreign, lang.tts);
    };

    const front = h(
      'div.face.front.index-card',
      h('p.card-label', deFront ? 'Deutsch' : lang.name),
      h('p.word', { lang: deFront ? 'de' : langAttr(lang) }, frontText),
      deFront ? null : speakButton(lang, info.foreign),
      h('p.flip-hint', icon('rotate', 16), 'Tippen zum Umdrehen'),
    );
    const back = h(
      'div.face.back.index-card',
      { 'aria-hidden': 'true' },
      h('p.card-label', deFront ? lang.name : 'Deutsch'),
      h('p.word.ink', { lang: deFront ? langAttr(lang) : 'de' }, backText),
      deFront ? speakButton(lang, info.foreign) : null,
    );
    const card = h(
      'div.flip',
      {
        role: 'button',
        tabindex: '0',
        'aria-label': 'Karte umdrehen',
        onclick: reveal,
        onkeydown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            reveal();
          }
        },
      },
      h('div.flip-inner', front, back),
    );
    actions.append(h('button.btn.btn-primary.btn-block.btn-lg', { type: 'button', onclick: reveal }, 'Aufdecken'));
    body.append(card, actions);
  }

  // ---------- Tippen ----------

  function showType(item, info) {
    const input = textInput({
      'aria-label': `Übersetzung auf ${lang.name}`,
      placeholder: 'Deine Antwort',
      lang: langAttr(lang),
      enterkeyhint: 'done',
      class: 'type-input',
    });
    const submit = h('button.btn.btn-primary.btn-block.btn-lg', { type: 'submit' }, 'Prüfen');
    const specials = specialsRow(input, specialCharsFor(lang.tts));
    const feedback = h('div.feedback', { 'aria-live': 'polite' });
    const nudge = h('p.form-msg.warn', { role: 'alert' });
    let finished = false;

    const form = h(
      'form.type-form',
      {
        onsubmit: (e) => {
          e.preventDefault();
          if (!input.value.trim()) {
            nudge.textContent = 'Schreibe zuerst deine Antwort auf.';
            input.focus();
            return;
          }
          finish(checkAnswer(input.value, info.foreign));
        },
      },
      input,
      specials,
      nudge,
      submit,
    );

    function finish(res) {
      if (finished) return;
      finished = true;
      input.disabled = true;
      form.classList.add('done');
      let proceeded = false;
      const proceed = (rating) => {
        if (proceeded) return;
        proceeded = true;
        answer(rating);
      };
      const typed = input.value.trim();
      const next = (rating, primary = true) => {
        const b = h(`button.btn.btn-block.btn-lg`, { type: 'button', class: primary ? 'btn-primary' : 'btn-secondary', onclick: () => proceed(rating) }, 'Weiter');
        return b;
      };
      let nextBtn;
      if (res.result === 'correct') {
        nextBtn = next(RATING.GOOD);
        feedback.append(h('div.fb.fb-ok', h('p.fb-title', icon('check', 22), 'Richtig!'), h('p.fb-answer', res.answer)), nextBtn);
        later(() => proceed(RATING.GOOD), 1100);
      } else if (res.result === 'near') {
        const why = { accent: 'Achte auf die Akzente und Sonderzeichen.', typo: 'Ein kleiner Tippfehler.', article: 'Beim Artikel oder Zusatz fehlt etwas (oder er ist zu viel).' }[res.reason] ?? '';
        nextBtn = next(RATING.HARD);
        feedback.append(
          h('div.fb.fb-near', h('p.fb-title', icon('warning', 22), 'Fast richtig'), why ? h('p.fb-why', why) : null, h('p.fb-line', h('span', 'Du: '), h('s', typed)), h('p.fb-line', h('span', 'Richtig: '), h('b.fb-answer', res.answer))),
          nextBtn,
        );
      } else {
        nextBtn = next(RATING.AGAIN);
        feedback.append(
          h('div.fb.fb-wrong', h('p.fb-title', icon('x', 22), 'Leider falsch'), h('p.fb-line', h('span', 'Du: '), h('s', typed)), h('p.fb-line', h('span', 'Richtig: '), h('b.fb-answer', res.answer))),
          nextBtn,
          h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: () => proceed(RATING.GOOD) }, 'Zählt als richtig (ich hatte recht)'),
        );
      }
      submit.hidden = true;
      if (specials) specials.hidden = true;
      if (store.get().settings.autoSpeak) speak(info.foreign, lang.tts);
      nextBtn.focus();
    }

    body.append(
      h('div.index-card.type-card', h('p.card-label', `Deutsch → ${lang.name}`), h('p.word', { lang: 'de' }, info.german)),
      form,
      feedback,
    );
    later(() => input.focus(), 80);
  }

  // ---------- Handschrift ----------

  function showDraw(item, info) {
    const pad = createDrawPad();
    let revealed = false;
    const answerBox = h('div.answer-box', { hidden: true }, h('p.card-label', `${lang.name}`), h('p.word.ink', { lang: langAttr(lang) }, info.foreign), speakButton(lang, info.foreign));
    const actions = h('div.learn-actions');
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      answerBox.hidden = false;
      clear(actions);
      actions.append(
        h(
          'div.rate-row.three',
          h('button.rate.rate-1', { type: 'button', onclick: () => answer(RATING.AGAIN) }, h('b', 'Falsch')),
          h('button.rate.rate-2', { type: 'button', onclick: () => answer(RATING.HARD) }, h('b', 'Fast')),
          h('button.rate.rate-3', { type: 'button', onclick: () => answer(RATING.GOOD) }, h('b', 'Richtig')),
        ),
      );
      if (store.get().settings.autoSpeak) speak(info.foreign, lang.tts);
    };
    actions.append(
      h(
        'button.btn.btn-primary.btn-block.btn-lg',
        {
          type: 'button',
          onclick: () => {
            if (!pad.ink) {
              toast('Schreibe das Wort zuerst auf.');
              return;
            }
            reveal();
          },
        },
        'Lösung zeigen',
      ),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: reveal }, 'Weiß ich nicht'),
    );
    body.append(
      h('div.index-card.draw-card', h('p.card-label', `Deutsch → ${lang.name}`), h('p.word', { lang: 'de' }, info.german)),
      h('div.pad-wrap', pad.el, h('button.icon-btn.pad-clear', { type: 'button', 'aria-label': 'Schreibfläche leeren', onclick: () => pad.clear() }, icon('eraser', 22))),
      answerBox,
      actions,
    );
    requestAnimationFrame(() => pad.resize());
  }

  // ---------- Ende der Runde ----------

  function showEmpty() {
    modeRow.hidden = true;
    bar.style.width = '0%';
    counter.textContent = '';
    clear(body);
    body.append(
      h(
        'div.summary',
        h('h2', 'Gerade nichts zu üben'),
        h('p', mode === 'all' ? 'In diesem Bereich gibt es keine Vokabeln.' : 'Heute ist nichts fällig, und es gibt keine neuen Vokabeln mehr für heute. Komm morgen wieder, dann sind neue Karten dran.'),
        mode === 'all'
          ? null
          : h('button.btn.btn-secondary.btn-block', { type: 'button', onclick: () => replaceRoute('learn', { ...params, mode: 'all' }) }, 'Trotzdem alles üben'),
        h('button.btn.btn-primary.btn-block', { type: 'button', onclick: () => goBack() }, 'Zurück'),
      ),
    );
  }

  function showSummary() {
    modeRow.hidden = true;
    bar.style.width = '100%';
    counter.textContent = `${queue.total} / ${queue.total}`;
    clear(body);
    const today = dayNumber();
    const s = store.get();
    const vocabs = store.vocabsForScope(scope);
    const more = hasMoreWork(vocabs, { today, mode, newLimit: newCap(vocabs, today), exclude: doneKeys });
    const streak = currentStreak(s.streak, today);
    const done = s.days[today]?.r ?? 0;
    const goal = s.settings.dailyGoal;
    const pct = round.answered ? Math.round((round.correct / round.answered) * 100) : 0;
    const stat = (value, text) => h('div.summary-stat', h('b', String(value)), h('span', text));

    body.append(
      h(
        'div.summary',
        h('h2', 'Runde geschafft'),
        h('div.summary-stats', stat(round.answered, 'Karten'), stat(`${pct} %`, 'gleich gewusst'), stat(round.newLearned, 'neu gelernt')),
        round.goalMet
          ? h('p.goal-banner', icon('flame', 22), `Tagesziel erreicht! ${streak.count} ${streak.count === 1 ? 'Tag' : 'Tage'} in Folge.`)
          : done < goal
            ? h('p.hint.center', `Noch ${goal - done} Karten bis zum Tagesziel.`)
            : h('p.hint.center', 'Dein Tagesziel hast du heute schon geschafft.'),
        more ? h('button.btn.btn-primary.btn-block.btn-lg', { type: 'button', onclick: startRound }, 'Nächste Runde') : null,
        h('button.btn.btn-block.btn-lg', { type: 'button', class: more ? 'btn-secondary' : 'btn-primary', onclick: () => goBack() }, 'Fertig'),
      ),
    );
    if (s.settings.reminderOn) refreshReminders();
  }

  startRound();

  return {
    el: root,
    refresh() {
      /* Während einer Runde wird nichts neu aufgebaut. */
    },
    destroy() {
      cancelTimers();
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* egal */
      }
    },
  };
}

// ============================================================
// Probetest
// ============================================================

const fmtPoints = (n) => String(Number.isInteger(n) ? n : n.toFixed(1)).replace('.', ',');

export function examView(params) {
  const { scope, label = 'Probetest', testId = null, count = null } = params;
  const lang = store.languageById(scope.languageId);
  const root = h('div.learn.exam');
  if (!lang) {
    setTimeout(() => goBack(), 0);
    return { el: root };
  }
  const cards = shuffle([...groupCards(store.vocabsForScope(scope)).values()]);
  const picked = cards.slice(0, count ?? cards.length);
  const n = picked.length;
  const answers = [];
  let idx = 0;

  const bar = h('span.learn-progress-bar');
  const counter = h('span.learn-counter');
  const body = h('div.learn-body');
  root.append(
    h(
      'header.learn-top',
      h(
        'button.icon-btn',
        {
          type: 'button',
          'aria-label': 'Probetest abbrechen',
          onclick: async () => {
            if (idx >= n) return goBack();
            const ok = await confirmDialog({ title: 'Probetest abbrechen?', text: 'Dein bisheriges Ergebnis geht verloren.', confirmLabel: 'Abbrechen', cancelLabel: 'Weitermachen', danger: true });
            if (ok) goBack();
          },
        },
        icon('x', 24),
      ),
      h('div.learn-progress', { role: 'progressbar', 'aria-label': label }, bar),
      counter,
    ),
    body,
  );

  function question() {
    clear(body);
    if (idx >= n) return results();
    const card = picked[idx];
    bar.style.width = `${(idx / n) * 100}%`;
    counter.textContent = `Frage ${idx + 1} / ${n}`;
    const input = textInput({ 'aria-label': `Übersetzung auf ${lang.name}`, placeholder: 'Deine Antwort', lang: langAttr(lang), enterkeyhint: idx + 1 === n ? 'done' : 'next', class: 'type-input' });
    const form = h(
      'form.type-form',
      {
        onsubmit: (e) => {
          e.preventDefault();
          answers.push({ key: card.key, german: card.rep.german, foreign: card.rep.foreign, typed: input.value.trim() });
          idx++;
          question();
        },
      },
      input,
      specialsRow(input, specialCharsFor(lang.tts)),
      h('button.btn.btn-primary.btn-block.btn-lg', { type: 'submit' }, idx + 1 === n ? 'Abgeben' : 'Weiter'),
    );
    body.append(h('div.index-card.type-card', h('p.card-label', `Deutsch → ${lang.name}`), h('p.word', { lang: 'de' }, card.rep.german)), form);
    setTimeout(() => input.focus(), 80);
  }

  function results() {
    bar.style.width = '100%';
    counter.textContent = `${n} / ${n}`;
    const today = dayNumber();
    const graded = answers.map((a) => ({ ...a, res: checkAnswer(a.typed, a.foreign) }));
    const points = graded.reduce((sum, g) => sum + (g.res.result === 'correct' ? 1 : g.res.result === 'near' ? 0.5 : 0), 0);
    const percent = n ? (points / n) * 100 : 0;
    const grade = gradeFor(percent);

    for (const g of graded) {
      const rating = g.res.result === 'correct' ? RATING.GOOD : g.res.result === 'near' ? RATING.HARD : RATING.AGAIN;
      store.applyReview(g.key, rating, today);
    }
    store.noteReviews(n, today);
    if (testId) store.updateTest(testId, { lastExam: { day: today, percent: Math.round(percent), grade: grade.grade } });
    if (store.get().settings.reminderOn) refreshReminders();

    const wrong = graded.filter((g) => g.res.result !== 'correct');
    const rightCount = graded.filter((g) => g.res.result === 'correct').length;
    clear(body);
    body.append(
      h(
        'div.summary.exam-result',
        h('div.grade-badge', h('span.grade-num', String(grade.grade)), h('span.grade-label', grade.label)),
        h('p.big', `${fmtPoints(points)} von ${n} Punkten · ${Math.round(percent)} %`),
        h('p.sub.center', `${rightCount} richtig${wrong.length ? `, ${wrong.length} mit Fehlern` : ''}. Fast richtige Antworten zählen einen halben Punkt.`),
        wrong.length
          ? h(
              'ul.mistakes',
              wrong.map((g) =>
                h(
                  'li.mistake',
                  h('span.mistake-de', g.german),
                  h('span.mistake-line', h('span', 'Du: '), g.typed ? h('s', g.typed) : h('em', 'leer'), g.res.result === 'near' ? h('span.badge.badge-near', 'fast richtig') : null),
                  h('span.mistake-line', h('span', 'Richtig: '), h('b', g.foreign)),
                ),
              ),
            )
          : h('p.goal-banner', icon('check', 22), 'Alles richtig. Stark!'),
        wrong.length
          ? h(
              'button.btn.btn-primary.btn-block.btn-lg',
              {
                type: 'button',
                onclick: () => replaceRoute('learn', { scope: { languageId: scope.languageId, folderIds: scope.folderIds ?? null, keys: wrong.map((g) => g.key) }, mode: 'all', label: 'Fehler üben' }),
              },
              'Fehler üben',
            )
          : null,
        h('button.btn.btn-block.btn-lg', { type: 'button', class: wrong.length ? 'btn-secondary' : 'btn-primary', onclick: () => goBack() }, 'Fertig'),
        h('details.scale', h('summary', 'Notenschlüssel'), h('p', `Verwendet wird ein Standardschlüssel: ${GRADE_SCALE.slice(0, 5).map((g) => `ab ${g.min} % eine ${g.grade}`).join(', ')}. Dein Lehrer kann einen anderen Schlüssel nutzen.`)),
      ),
    );
  }

  if (!n) {
    body.append(h('div.summary', h('h2', 'Keine Vokabeln'), h('p', 'In den ausgewählten Ordnern gibt es keine Vokabeln.'), h('button.btn.btn-primary.btn-block', { type: 'button', onclick: () => goBack() }, 'Zurück')));
  } else {
    question();
  }

  return { el: root, refresh() {} };
}


