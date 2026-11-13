/* Frammenti HTML riusati da più viste. */

import { S } from '../state.js';
import { COLORE_FUORI } from '../core/costanti.js';
import { esc, eur, sigla } from '../core/formato.js';
import { colore, inAttesaDiRimborso } from '../core/calcoli.js';

/* Stop del conic-gradient per il grafico a ciambella. */
function gradiente(ordinate, tot) {
  if (!ordinate.length) return '#E5E5EA 0% 100%';
  let acc = 0;
  return ordinate.map((c) => {
    const a = (acc / tot) * 100; acc += c.val;
    return c.colore + ' ' + a.toFixed(2) + '% ' + ((acc / tot) * 100).toFixed(2) + '%';
  }).join(',');
}

/* Fette della ciambella: prima il portafoglio, poi le categorie escluse in grigio. */
export function fetteUscite(r) {
  return r.portafoglio.concat(r.fuori.map((c) => Object.assign({}, c, { colore: COLORE_FUORI })));
}

/* taglia: 'lg' (Statistiche) */
export function ciambella(ordinate, tot, etichetta, valore, taglia) {
  return '<div class="donut donut--' + taglia + '" style="background:conic-gradient(' + gradiente(ordinate, tot) + ')">'
    + '<div class="donut-foro"><div class="lbl">' + etichetta + '</div><div class="num donut-val">' + valore + '</div></div></div>';
}

export function importoMovimento(m) {
  return (m.tipo === 'uscita' ? '−' : '+') + eur(m.importo);
}

function coloreMovimento(m) {
  return colore(S.dati, m.categoria, m.tipo);
}

export function avatarCategoria(m, classe) {
  return '<div class="avatar' + (classe ? ' ' + classe : '') + '" style="background:' + coloreMovimento(m) + '">' + esc(sigla(m.categoria)) + '</div>';
}

function testoMovimento(m) {
  return '<div class="mov-testo"><div class="ell mov-titolo">' + esc(m.descrizione || m.categoria) + '</div>'
    + '<div class="ell mov-sub">' + esc(m.categoria) + (inAttesaDiRimborso(S.dati, m) ? ' · in attesa' : '') + '</div></div>';
}

function classeImporto(m) {
  return 'num mov-importo' + (m.tipo === 'entrata' ? ' is-entrata' : '');
}

/* Riga compatta con pallino colorato (Storico, già raggruppato per giorno). */
export function rigaMovimentoCompatta(m) {
  return '<button class="row" data-det="' + m.id + '">'
    + '<i class="dot" style="background:' + coloreMovimento(m) + '"></i>'
    + testoMovimento(m)
    + '<div class="' + classeImporto(m) + '">' + importoMovimento(m) + '</div></button>';
}
