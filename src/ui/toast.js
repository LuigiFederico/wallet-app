/* Messaggio temporaneo in basso, con pulsante "Annulla" opzionale.
   ritardo (ms): lo mostra dopo, per esempio a fine animazione del salvataggio. */

import { S } from '../state.js';
import { esc } from '../core/formato.js';

let timer = null;

export function toast(msg, annulla, ritardo) {
  clearTimeout(timer);
  if (ritardo) { timer = setTimeout(() => toast(msg, annulla), ritardo); return; }
  const el = document.getElementById('toast');
  el.innerHTML = '<div class="toast">'
    + '<div class="toast-msg">' + esc(msg) + '</div>'
    + (annulla ? '<button id="undo" class="toast-undo">Annulla</button>' : '')
    + '</div>';
  el.hidden = false;
  if (annulla) document.getElementById('undo').onclick = annulla;
  timer = setTimeout(() => { el.hidden = true; S.annullaSnapshot = null; }, annulla ? 6000 : 3200);
}

export function nascondiToast() {
  document.getElementById('toast').hidden = true;
}
