// src/utils/dom.js
export const $ = (sel, root = document) => root.querySelector(sel);

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function setText(el, text) {
  el.textContent = text;
}

export function showSpinner(where) {
  const s = document.createElement('div');
  s.className = 'spinner';
  where.append(s);
  return s;
}
