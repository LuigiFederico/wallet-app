/* Messaggio temporaneo in basso, con pulsante "Annulla" opzionale. */

import { S } from '../state.js';
import { esc } from '../core/formato.js';

let timer = null;

export function toast(msg, annulla) {
  const el = document.getElementById('toast');
  el.innerHTML = '<div class="toast">'
    + '<div class="toast-msg">' + esc(msg) + '</div>'
    + (annulla ? '<button id="undo" class="toast-undo">Annulla</button>' : '')
    + '</div>';
  el.hidden = false;
  if (annulla) document.getElementById('undo').onclick = annulla;
  clearTimeout(timer);
  timer = setTimeout(() => { el.hidden = true; S.annullaSnapshot = null; }, annulla ? 6000 : 3200);
}

export function nascondiToast() {
  document.getElementById('toast').hidden = true;
}
