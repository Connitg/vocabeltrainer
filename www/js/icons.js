// Eigene, einfache Linien-Symbole (kein Download nötig, funktioniert offline).

const PATHS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  chevronLeft: '<path d="M15 5l-7 7 7 7"/>',
  volume: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a8 8 0 010 11"/>',
  pencil: '<path d="M4 20l4-1 11-11a2.1 2.1 0 00-3-3L5 16l-1 4z"/><path d="M14 7l3 3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>',
  flame: '<path d="M12 3c.6 3.2 5 5.2 5 10a5 5 0 01-10 0c0-1.9.9-3.1 2-4 .2 1.4.9 2.2 1.9 2.5C10.7 9.1 11 5.8 12 3z"/>',
  folder: '<path d="M3 7a2 2 0 012-2h4l2 2.5h8a2 2 0 012 2V17a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/>',
  more: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>',
  eraser: '<path d="M8 20h12M5.5 14.5l7-7a2 2 0 013 0l2 2a2 2 0 010 3L11 19H8l-2.5-2.5a2 2 0 010-2z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  download: '<path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 19h14"/>',
  upload: '<path d="M12 16V5M7.5 9L12 4.5 16.5 9M5 19h14"/>',
  bell: '<path d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2 2 0 004 0"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  play: '<path d="M8 5.5v13l11-6.5-11-6.5z"/>',
  today: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M9 15l2 2 4-4"/>',
  books: '<path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3V4z"/><path d="M5 17a3 3 0 013-3h10"/>',
  exam: '<path d="M8 4h8l3 3v13H5V4h3z"/><path d="M9 13l2 2 4-4"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  rotate: '<path d="M20 12a8 8 0 11-2.5-5.8M20 4v4h-4"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17"/>',
  warning: '<path d="M12 4l9 16H3L12 4z"/><path d="M12 10v4M12 17h.01"/>',
};

/** Gibt ein <span> mit dem Symbol zurück. Die Pfade sind feste Texte aus dieser Datei, kein Nutzertext. */
export function icon(name, size = 22) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.style.width = span.style.height = `${size}px`;
  span.innerHTML =
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" ` +
    `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">` +
    `${PATHS[name] ?? ''}</svg>`;
  return span;
}
