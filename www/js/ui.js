// Kleine Helfer zum Bauen der Oberfläche: Elemente, Pop-ups (Sheets), Bestätigungen, Hinweise.

import { icon } from './icons.js';
import { pushLayer, closeLayer } from './nav.js';

export { icon };

const DIRECT_PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden', 'readOnly', 'indeterminate']);

/**
 * h('button.btn.primary', { onclick }, 'Text', icon('plus'))
 * Texte werden immer als Text eingefügt (nie als HTML), dadurch sind Vokabeln mit Sonderzeichen unproblematisch.
 */
export function h(tag, props, ...children) {
  const tokens = tag.split(/(?=[.#])/);
  let name = 'div';
  if (tokens.length && !/^[.#]/.test(tokens[0])) name = tokens.shift();
  const el = document.createElement(name);
  for (const t of tokens) {
    if (t.startsWith('.')) el.classList.add(t.slice(1));
    else if (t.startsWith('#')) el.id = t.slice(1);
  }
  if (props && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props)) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') {
        const list = Array.isArray(v) ? v : String(v).split(/\s+/);
        list.filter(Boolean).forEach((c) => el.classList.add(c));
      } else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'for') el.htmlFor = v;
      else if (DIRECT_PROPS.has(k)) el[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  } else if (props != null) {
    children.unshift(props);
  }
  appendAll(el, children);
  return el;
}

function appendAll(el, list) {
  for (const c of list) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) appendAll(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function layersRoot() {
  return document.getElementById('layers');
}

// ---------- Pop-up von unten ----------

/**
 * @param {{title:string, content:(api:{close:()=>Promise<void>, el:HTMLElement})=>Node, onClosed?:()=>void, compact?:boolean}} o
 */
export function openSheet({ title, content, onClosed, compact = false }) {
  const wrap = h('div.sheet-wrap');
  const backdrop = h('div.sheet-backdrop');
  const panel = h('section.sheet', {
    class: compact ? 'sheet-compact' : '',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
  });
  const handle = pushLayer(() => {
    wrap.remove();
    onClosed?.();
  });
  const api = { close: () => closeLayer(handle), el: panel };
  const head = h(
    'header.sheet-head',
    h('h2', title),
    h('button.icon-btn', { type: 'button', 'aria-label': 'Schließen', onclick: () => api.close() }, icon('x', 22)),
  );
  panel.append(head, h('div.sheet-body', content(api)));
  backdrop.addEventListener('click', () => api.close());
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') api.close();
  });
  wrap.append(backdrop, panel);
  layersRoot().appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  const first = panel.querySelector('input:not([type=checkbox]):not([type=radio]), textarea, select');
  if (first && !compact) setTimeout(() => first.focus(), 60);
  return api;
}

/** Ja/Nein-Frage. Gibt ein Promise<boolean> zurück. */
export function confirmDialog({ title, text, confirmLabel = 'OK', cancelLabel = 'Abbrechen', danger = false }) {
  return new Promise((resolve) => {
    let answer = false;
    openSheet({
      title,
      compact: true,
      onClosed: () => resolve(answer),
      content: (api) =>
        h(
          'div.confirm',
          text ? h('p.confirm-text', text) : null,
          h(
            'div.btn-row',
            h('button.btn.btn-secondary', { type: 'button', onclick: () => api.close() }, cancelLabel),
            h(
              'button.btn',
              {
                type: 'button',
                class: danger ? 'btn-danger' : 'btn-primary',
                onclick: () => {
                  answer = true;
                  api.close();
                },
              },
              confirmLabel,
            ),
          ),
        ),
    });
  });
}

// ---------- Kurze Hinweise ----------

export function toast(message, ms = 2600) {
  const root = layersRoot();
  const el = h('div.toast', { role: 'status' }, message);
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, ms);
}

// ---------- Formular-Bausteine ----------

export function field(label, input, hint) {
  return h('label.field', h('span.field-label', label), input, hint ? h('span.field-hint', hint) : null);
}

export function textInput(props = {}) {
  return h('input.input', {
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    ...props,
  });
}

/** Schalter. onChange bekommt true/false. */
export function toggle(checked, onChange, label) {
  const input = h('input', {
    type: 'checkbox',
    role: 'switch',
    checked: !!checked,
    'aria-label': label,
    onchange: (e) => onChange(e.target.checked),
  });
  return h('span.toggle', input, h('span.toggle-track', h('span.toggle-thumb')));
}

/** Plus/Minus-Zähler. */
export function stepper({ value, min, max, step = 1, onChange, label, suffix = '' }) {
  const out = h('output.stepper-value', `${value}${suffix}`);
  let current = value;
  const set = (v) => {
    current = Math.min(max, Math.max(min, v));
    out.textContent = `${current}${suffix}`;
    minus.disabled = current <= min;
    plus.disabled = current >= max;
    onChange(current);
  };
  const minus = h('button.icon-btn.stepper-btn', { type: 'button', 'aria-label': `${label} verringern`, onclick: () => set(current - step) }, '−');
  const plus = h('button.icon-btn.stepper-btn', { type: 'button', 'aria-label': `${label} erhöhen`, onclick: () => set(current + step) }, '+');
  minus.disabled = current <= min;
  plus.disabled = current >= max;
  return h('span.stepper', minus, out, plus);
}

/** Mehrere Knöpfe, genau einer aktiv. */
export function segmented(options, value, onChange, label) {
  const wrap = h('div.seg', { role: 'group', 'aria-label': label });
  const buttons = options.map((o) => {
    const b = h(
      'button.seg-btn',
      {
        type: 'button',
        'aria-pressed': String(o.value === value),
        onclick: () => {
          buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          onChange(o.value);
        },
      },
      o.label,
    );
    return b;
  });
  wrap.append(...buttons);
  return wrap;
}

export function emptyState(title, text, action) {
  return h('div.empty', h('h3', title), text ? h('p', text) : null, action ?? null);
}

export function pluralize(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
