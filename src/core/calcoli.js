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
  // portafoglio: le categorie che contano in "uscite"; fuori: quelle escluse
  const ex = escluse(dati, 'uscita');
  const portafoglio = ordinate.filter((c) => ex.indexOf(c.nome) < 0);
  const fuori = ordinate.filter((c) => ex.indexOf(c.nome) >= 0);
  return { movs, entrate, uscite, rimasto: entrate - uscite, catTot, tot, ordinate, portafoglio, fuori };
}

export function daRimborsare(movs) {
  return movs.filter((m) => m.tipo === 'uscita' && inAttesaDiRimborso(m)).reduce((s, m) => s + m.importo, 0);
}

/* Budget di un periodo: 'AAAA-MM' è il mese, 'AAAA' la somma dei mesi di quell'anno. */
export function budgetDi(dati, periodo) {
  if (periodo.length === 7) return dati.budget[periodo] || {};
  const somma = {};
  Object.keys(dati.budget).filter((k) => k.slice(0, 4) === periodo).forEach((k) => {
    Object.entries(dati.budget[k]).forEach(([nome, v]) => { somma[nome] = (somma[nome] || 0) + v; });
  });
  return somma;
}

/* Ultimo mese prima di `mese` con almeno un budget impostato, oppure null. */
export function meseBudgetPrecedente(dati, mese) {
  const k = Object.keys(dati.budget)
    .filter((m) => m < mese && Object.values(dati.budget[m]).some((v) => v > 0))
    .sort();
  return k.length ? k[k.length - 1] : null;
}

/* Quante categorie hanno un budget e quanto fanno in tutto. */
export function totaleBudget(bm) {
  const valori = Object.values(bm).filter((v) => v > 0);
  return { categorie: valori.length, totale: valori.reduce((a, b) => a + b, 0) };
}

/* Una riga per ogni categoria di uscita: speso, budget del periodo, differenza, barra. */
export function righeBudget(dati, periodo, catTot) {
  return righeConBudget(dati, budgetDi(dati, periodo), catTot);
}
export function righeConBudget(dati, bm, catTot) {
  return dati.categorie.uscite.map((c) => {
    const speso = catTot[c.nome] || 0, bud = bm[c.nome] || 0, diff = bud - speso;
    return {
      nome: c.nome, colore: c.colore, speso, bud, diff,
      w: Math.min(100, bud ? (speso / bud) * 100 : (speso ? 100 : 0)).toFixed(1) + '%',
      barColore: bud && speso > bud ? '#C0452B' : c.colore
    };
  }).sort((a, b) => b.speso - a.speso);
}
