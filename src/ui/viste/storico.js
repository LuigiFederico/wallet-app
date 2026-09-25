/* Storico: movimenti del mese raggruppati per giorno, con filtri e ricerca su tutti i mesi. */

import { S } from '../../state.js';
import { esc, etichettaData, eurSegno } from '../../core/formato.js';
import { FILTRI_STORICO, DA_RIMBORSARE, INVESTIMENTI } from '../../core/costanti.js';
import { delMese, inAttesaDiRimborso } from '../../core/calcoli.js';
import { rigaMovimentoCompatta } from '../componenti.js';

const FILTRI = {
  'Uscite': (m) => m.tipo === 'uscita',
  'Entrate': (m) => m.tipo === 'entrata',
  [DA_RIMBORSARE]: inAttesaDiRimborso,
  [INVESTIMENTI]: (m) => m.categoria === INVESTIMENTI
};

function movimentiFiltrati() {
  const q = S.query.toLowerCase();
  let lista = S.query ? S.dati.movimenti.slice() : delMese(S.dati.movimenti, S.mese);
  if (FILTRI[S.filtro]) lista = lista.filter(FILTRI[S.filtro]);
  if (q) lista = lista.filter((m) => (m.descrizione || '').toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q));
  return lista.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}

/* [{ k: data, righe: [...], net: saldo del giorno }] nell'ordine della lista */
function perGiorno(lista) {
  const gruppi = [];
  lista.forEach((m) => {
    let g = gruppi.find((x) => x.k === m.data);
    if (!g) { g = { k: m.data, righe: [], net: 0 }; gruppi.push(g); }
    g.righe.push(m);
    g.net += m.tipo === 'uscita' ? -m.importo : m.importo;
  });
  return gruppi;
}

function gruppo(g) {
  return '<div><div class="giorno-testa">'
    + '<div class="giorno-data">' + esc(etichettaData(g.k)) + '</div>'
    + '<div class="num giorno-saldo">' + eurSegno(g.net) + '</div></div>'
    + '<div class="card lista lista--giorno">' + g.righe.map(rigaMovimentoCompatta).join('') + '</div></div>';
}

export function vistaStorico() {
  const lista = movimentiFiltrati();
  const gruppi = perGiorno(lista);

  return '<div class="cerca">'
    + '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6.8" cy="6.8" r="5" stroke="#6F675C" stroke-width="1.6"/><path d="M10.6 10.6L14.5 14.5" stroke="#6F675C" stroke-width="1.6" stroke-linecap="round"/></svg>'
    + '<input id="q" class="cerca-input" value="' + esc(S.query) + '" placeholder="Cerca in tutti i mesi">'
    + '</div>'
    + '<div class="chips">' + FILTRI_STORICO
        .map((f) => '<button class="chip" data-filtro="' + f + '" data-on="' + (S.filtro === f ? 1 : 0) + '">' + f + '</button>').join('') + '</div>'
    + (S.query ? '<div class="risultati">' + lista.length + ' risultati in tutti i mesi</div>' : '')
    + (gruppi.length
        ? '<div class="giorni">' + gruppi.map(gruppo).join('') + '</div>'
        : '<div class="vuoto vuoto--alto">Nessun movimento con questi filtri.</div>');
}
