/* Totali, riepiloghi e budget. Funzioni pure: ricevono i dati, non leggono lo stato. */

import { COLORE_DEFAULT, RUOLO_RIMBORSO } from './costanti.js';
import { spostaChiaveMese } from './formato.js';

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

/* la categoria con quel ruolo nel tipo dato, oppure undefined */
export function categoriaConRuolo(dati, tipo, ruolo) {
  return categorie(dati, tipo).find((c) => c.ruolo === ruolo);
}
/* la categoria del movimento (o della bozza) ha quel ruolo? */
export function haRuolo(dati, m, ruolo) {
  const c = categoriaConRuolo(dati, m.tipo, ruolo);
  return !!c && c.nome === m.categoria;
}

export function inAttesaDiRimborso(dati, m) {
  return haRuolo(dati, m, RUOLO_RIMBORSO) && !m.rimborsato;
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

export function daRimborsare(dati, movs) {
  return movs.filter((m) => m.tipo === 'uscita' && inAttesaDiRimborso(dati, m)).reduce((s, m) => s + m.importo, 0);
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

/* Andamento di una categoria, un valore per mese dal mese del primo movimento a `oggi` ('AAAA-MM').
   media: totale diviso per tutti i mesi, anche quelli a zero. delta: `mese` meno il mese prima.
   Il budget c'è solo per le uscite; sforati = mesi con un budget superato. */
export function andamentoCategoria(dati, tipo, nome, mese, oggi) {
  const somma = {};
  dati.movimenti.filter((m) => m.tipo === tipo && m.categoria === nome)
    .forEach((m) => { const k = m.data.slice(0, 7); somma[k] = (somma[k] || 0) + m.importo; });
  const primo = dati.movimenti.reduce((min, m) => (m.data.slice(0, 7) < min ? m.data.slice(0, 7) : min), oggi);
  const mesi = [];
  for (let k = primo; k <= oggi; k = spostaChiaveMese(k, 1)) {
    mesi.push({ k, val: somma[k] || 0, bud: tipo === 'uscita' ? (dati.budget[k] || {})[nome] || 0 : 0 });
  }
  const totale = mesi.reduce((s, m) => s + m.val, 0);
  const corrente = somma[mese] || 0, precedente = somma[spostaChiaveMese(mese, -1)] || 0;
  return {
    mesi, totale, media: totale / mesi.length, corrente, precedente, delta: corrente - precedente,
    conBudget: mesi.filter((m) => m.bud > 0).length,
    sforati: mesi.filter((m) => m.bud > 0 && m.val > m.bud).length
  };
}
