/* Totali, riepiloghi e budget. Funzioni pure: ricevono i dati, non leggono lo stato. */

import { COLORE_DEFAULT, DA_RIMBORSARE } from './costanti.js';

export function categorie(dati, tipo) {
  return tipo === 'entrata' ? dati.categorie.entrate : dati.categorie.uscite;
}
export function colore(dati, nome, tipo) {
  const c = categorie(dati, tipo).find((x) => x.nome === nome);
  return c ? c.colore : COLORE_DEFAULT;
}
/* categorie escluse dal "totale portafoglio" per il tipo dato */
export function escluse(dati, tipo) {
  const e = dati.escludiDaPortafoglio || { uscite: [], entrate: [] };
  return (tipo === 'entrata' ? e.entrate : e.uscite) || [];
}

export function inAttesaDiRimborso(m) {
  return m.categoria === DA_RIMBORSARE && !m.rimborsato;
}

export function delMese(movimenti, mese) {
  return movimenti.filter((m) => m.data.slice(0, 7) === mese);
}
export function dellAnno(movimenti, anno) {
  return movimenti.filter((m) => m.data.slice(0, 4) === anno);
}

/* Somma degli importi di un tipo; con soloPortafoglio salta le categorie escluse. */
export function totale(dati, movs, tipo, soloPortafoglio) {
  const ex = escluse(dati, tipo);
  return movs.filter((m) => m.tipo === tipo && (!soloPortafoglio || ex.indexOf(m.categoria) < 0))
    .reduce((s, m) => s + m.importo, 0);
}

/* { categoria: totale } delle uscite (tutte, anche quelle escluse dal portafoglio) */
export function uscitePerCategoria(movs) {
  const catTot = {};
  movs.filter((m) => m.tipo === 'uscita').forEach((m) => { catTot[m.categoria] = (catTot[m.categoria] || 0) + m.importo; });
  return catTot;
}

/* Riepilogo di un insieme di movimenti (un mese o un anno). */
export function riepilogo(dati, movs) {
  const entrate = totale(dati, movs, 'entrata', true), uscite = totale(dati, movs, 'uscita', true);
  const catTot = uscitePerCategoria(movs);
  const tot = Object.values(catTot).reduce((a, b) => a + b, 0);
  const ordinate = Object.keys(catTot)
    .map((n) => ({ nome: n, val: catTot[n], colore: colore(dati, n, 'uscita') }))
    .sort((a, b) => b.val - a.val);
  return { movs, entrate, uscite, rimasto: entrate - uscite, catTot, tot, ordinate };
}

export function daRimborsare(movs) {
  return movs.filter((m) => m.tipo === 'uscita' && inAttesaDiRimborso(m)).reduce((s, m) => s + m.importo, 0);
}

/* Una riga per ogni categoria di uscita: speso, budget del mese, differenza, barra. */
export function righeBudget(dati, mese, catTot) {
  const bm = dati.budget[mese] || {};
  return dati.categorie.uscite.map((c) => {
    const speso = catTot[c.nome] || 0, bud = bm[c.nome] || 0, diff = bud - speso;
    return {
      nome: c.nome, colore: c.colore, speso, bud, diff,
      w: Math.min(100, bud ? (speso / bud) * 100 : (speso ? 100 : 0)).toFixed(1) + '%',
      barColore: bud && speso > bud ? '#C0452B' : c.colore
    };
  }).sort((a, b) => b.speso - a.speso);
}
