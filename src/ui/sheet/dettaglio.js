/* Sheet "dettaglio movimento": rimborso, duplica, elimina. */

import { S } from '../../state.js';
import { DA_RIMBORSARE } from '../../core/costanti.js';
import { esc, etichettaData } from '../../core/formato.js';
import { avatarCategoria, importoMovimento } from '../componenti.js';

export function sheetDettaglio() {
  const m = S.dettaglio;
  return '<div class="sheet" id="sheetDet"><div class="scrim" data-close="1"></div>'
    + '<div class="panel panel--card">'
    + '<div class="det-testa">'
    + avatarCategoria(m, 'avatar--grande')
    + '<div class="det-testo"><div class="ell det-titolo">' + esc(m.descrizione || m.categoria) + '</div>'
    + '<div class="ell det-sub">' + esc(m.categoria) + ' · ' + esc(etichettaData(m.data)) + (m.rimborsato ? ' · rimborsato' : '') + '</div></div>'
    + '<div class="num det-importo' + (m.tipo === 'entrata' ? ' is-entrata' : '') + '">' + importoMovimento(m) + '</div></div>'
    + (m.categoria === DA_RIMBORSARE ? '<button id="detRimb" class="cta cta--rimborso">' + (m.rimborsato ? 'Segna come non rimborsato' : 'Segna come rimborsato') + '</button>' : '')
    + '<div class="det-azioni">'
    + '<button id="detDup" class="det-btn">Duplica</button>'
    + '<button id="detDel" class="det-btn det-btn--elimina">Elimina</button></div>'
    + '<button data-close="1" class="btn-chiudi">Chiudi</button>'
    + '</div></div>';
}
