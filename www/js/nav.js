// Navigation über den Browser-Verlauf (history.pushState).
// Vorteil: Die Android-Zurück-Taste funktioniert ohne Zusatz-Plugin, auch für Pop-ups ("Sheets").

const listeners = new Set();
let route = { name: 'home', params: {} };
let depth = 0;
const layers = [];
let waiting = [];

export const TABS = ['home', 'vocab', 'tests', 'settings'];

export function currentRoute() {
  return route;
}

export function onRoute(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(kind) {
  listeners.forEach((fn) => fn(route, kind));
}

const sameRoute = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function startRouter(initial = { name: 'home', params: {} }) {
  const st = history.state;
  route = st?.route ?? initial;
  depth = st?.depth ?? 0;
  history.replaceState({ route, depth, sheetDepth: 0 }, '');
  window.addEventListener('popstate', onPop);
  emit('init');
}

function onPop(e) {
  const st = e.state;
  if (!st) return;
  const target = st.sheetDepth ?? 0;
  while (layers.length > target) {
    const layer = layers.pop();
    layer.closed = true;
    layer.destroy();
  }
  const resolvers = waiting;
  waiting = [];
  resolvers.forEach((r) => r());
  depth = st.depth ?? 0;
  if (st.route && !sameRoute(st.route, route)) {
    route = st.route;
    emit('pop');
  }
}

/** Neue Seite öffnen (Zurück-Taste führt zur vorherigen Seite). */
export function navigate(name, params = {}) {
  route = { name, params };
  depth += 1;
  history.pushState({ route, depth, sheetDepth: 0 }, '');
  emit('push');
}

/** Seite ersetzen (ohne neuen Verlaufseintrag), z. B. beim Wechsel der Registerkarte. */
export function replaceRoute(name, params = {}) {
  route = { name, params };
  history.replaceState({ route, depth, sheetDepth: 0 }, '');
  emit('replace');
}

export function switchTab(name) {
  replaceRoute(name, {});
}

/** Eine Seite zurück; gibt es keine, geht es zu `fallback`. */
export function goBack(fallback = { name: 'home', params: {} }) {
  if (depth > 0) history.back();
  else replaceRoute(fallback.name, fallback.params);
}

/** Registriert eine Ebene (Pop-up). Gibt ein Handle zum Schließen zurück. */
export function pushLayer(destroy) {
  const handle = { destroy, closed: false };
  layers.push(handle);
  history.pushState({ route, depth, sheetDepth: layers.length }, '');
  return handle;
}

/** Schließt die Ebene. Das Promise ist erfüllt, sobald sie wirklich weg ist. */
export function closeLayer(handle) {
  if (handle.closed) return Promise.resolve();
  const idx = layers.indexOf(handle);
  if (idx === -1) return Promise.resolve();
  return new Promise((resolve) => {
    waiting.push(resolve);
    history.go(-(layers.length - idx));
  });
}

export function hasOpenLayer() {
  return layers.length > 0;
}
