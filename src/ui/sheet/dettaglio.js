/* Sheet "dettaglio movimento": rimborso, modifica, duplica, elimina. */

import { S } from '../../state.js';
import { RUOLO_RIMBORSO } from '../../core/costanti.js';
import { esc, etichettaData } from '../../core/formato.js';
import { inAttesaDiRimborso, haRuolo } from '../../core/calcoli.js';
import { avatarCategoria, importoMovimento } from '../componenti.js';

const ICONA_MODIFICA = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11.8 2.8 15.2 6.2 6.4 15H3v-3.4l8.8-8.8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 4.6 13.4 8" stroke="currentColor" stroke-width="1.6"/></svg>';
const ICONA_DUPLICA = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="5.5" y="5.5" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M12.5 3.2A1.6 1.6 0 0 0 11 2.5H4A1.5 1.5 0 0 0 2.5 4v7c0 .7.4 1.2 1 1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const ICONA_ELIMINA = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M7 5V3.5h4V5M4.5 5l.8 10h7.4l.8-10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function sheetDettaglio() {
  const m = S.dettaglio;
  return '<div class="sheet" id="sheetDet"><div class="scrim" data-close="1"></div>'
    + '<div class="panel panel--card" role="dialog" aria-label="Dettaglio movimento">'
    + '<div class="det-testa">'
    + avatarCategoria(m, 'avatar--grande')
    + '<div class="det-testo"><div class="ell det-titolo">' + esc(m.descrizione || m.categoria) + '</div>'
    + '<div class="ell det-sub">' + esc(m.categoria) + ' · ' + esc(etichettaData(m.data))
    + (m.rimborsato ? ' · rimborsato' : inAttesaDiRimborso(S.dati, m) ? ' · <span class="det-attesa">in attesa</span>' : '') + '</div></div>'
    + '<div class="num det-importo' + (m.tipo === 'entrata' ? ' is-entrata' : '') + '">' + importoMovimento(m) + '</div></div>'
    + (haRuolo(S.dati, m, RUOLO_RIMBORSO) ? '<button id="detRimb" class="cta cta--rimborso">' + (m.rimborsato ? 'Segna come non rimborsato' : 'Segna come rimborsato') + '</button>' : '')
    + '<div class="det-azioni">'
    + '<button id="detMod" class="det-btn">' + ICONA_MODIFICA + 'Modifica</button>'
    + '<button id="detDup" class="det-btn">' + ICONA_DUPLICA + 'Duplica su oggi</button>'
    + '<button id="detDel" class="det-btn det-btn--elimina">' + ICONA_ELIMINA + 'Elimina</button></div>'
    + '<button data-close="1" class="btn-chiudi">Chiudi</button>'
    + '</div></div>';
}
