/* Sheet "quale versione tenere": il file nella cartella e i dati del telefono sono diversi. */

import { S } from '../../state.js';
import { FILENAME } from '../../core/costanti.js';
import { esc, oggiISO, quando } from '../../core/formato.js';
import { nomeBackup } from '../../core/dati.js';

const ICONA_SCUDO = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.8 3 4.2v4.3c0 3.7 2.6 6.6 6 7.7 3.4-1.1 6-4 6-7.7V4.2L9 1.8Z" stroke="#44379A" stroke-width="1.5" stroke-linejoin="round"/><path d="m6.2 9 2 2 3.8-4" stroke="#44379A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function movimenti(n) {
  return n + (n === 1 ? ' movimento' : ' movimenti');
}

function opzione(valore, titolo, dettaglio) {
  const c = S.conflitto, on = c.scelta === valore;
  return '<label class="opzione" data-on="' + (on ? 1 : 0) + '">'
    + '<input type="radio" name="versione" value="' + valore + '"' + (on ? ' checked' : '') + '>'
    + '<span class="opzione-testo"><span class="opzione-titolo">' + titolo
    + (c.piuRecente === valore ? '<span class="badge">Più recente</span>' : '') + '</span>'
    + '<span class="opzione-dettaglio">' + dettaglio + '</span></span></label>';
}

export function sheetConflitto() {
  const c = S.conflitto, cartella = '<strong>' + esc(c.h.name) + '</strong>', nuova = c.origine === 'nuova';
  return '<div class="sheet" id="sheetConf"><div class="scrim" data-close="1"></div>'
    + '<div class="panel" role="dialog" aria-labelledby="confTitolo">'
    + '<h2 id="confTitolo" class="sheet-titolo conf-titolo">' + (nuova ? 'In questa cartella c\'è già un file' : 'Il file è stato aggiornato altrove') + '</h2>'
    + '<p class="conf-testo">' + (nuova ? cartella + ' contiene già ' + FILENAME + '.' : FILENAME + ' in ' + cartella + ' è cambiato da un altro dispositivo.')
    + ' Quale versione vuoi tenere?</p>'
    + '<fieldset class="opzioni"><legend class="nascosto">Versione da tenere</legend>'
    + opzione('locale', 'Dati di questo telefono', movimenti(S.dati.movimenti.length) + ' · modificati ' + quando(S.dati.aggiornato))
    + opzione('file', 'Il file nella cartella', movimenti(c.file.movimenti.length) + (c.file.aggiornato ? ' · modificato ' + quando(c.file.aggiornato) : ''))
    + '</fieldset>'
    + '<div class="conf-nota">' + ICONA_SCUDO + '<div>L\'altra versione non si perde: la salvo come <strong>' + nomeBackup(oggiISO()) + '</strong> nella stessa cartella.</div></div>'
    + '<button id="confOk" class="cta">' + (c.scelta === 'locale' ? 'Tieni i dati del telefono' : 'Usa il file della cartella') + '</button>'
    + '<button data-close="1" class="btn-chiudi">' + (nuova ? 'Non collegare la cartella' : 'Decidi più tardi') + '</button>'
    + '</div></div>';
}
