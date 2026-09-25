/* Formattazione di date, importi e testo. Nessuna dipendenza dallo stato. */

import { MESI, SIGLE } from './costanti.js';

/* Date come stringhe ISO locali: 'AAAA-MM-GG' per i giorni, 'AAAA-MM' per i mesi. */

export function isoData(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function oggiISO() {
  return isoData(new Date());
}
export function chiaveMese(anno, indice) {
  return anno + '-' + String(indice + 1).padStart(2, '0');
}
export function indiceMese(iso) {
  return parseInt(iso.slice(5, 7), 10) - 1;
}
export function nomeMese(mese) {
  return MESI[indiceMese(mese)] + ' ' + mese.slice(0, 4);
}
export function giorniNelMese(mese) {
  return new Date(parseInt(mese.slice(0, 4), 10), parseInt(mese.slice(5), 10), 0).getDate();
}
export function spostaChiaveMese(mese, delta) {
  let y = parseInt(mese.slice(0, 4), 10), m = parseInt(mese.slice(5), 10) + delta;
  if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
  return y + '-' + String(m).padStart(2, '0');
}

/* '18 set' */
export function dataBreve(iso) {
  return iso.slice(8) + ' ' + SIGLE[indiceMese(iso)].toLowerCase();
}
/* 'Oggi · 18 set', 'Ieri · 17 set', '16 settembre' */
export function etichettaData(iso) {
  const g = iso.slice(8), m = MESI[indiceMese(iso)];
  if (iso === oggiISO()) return 'Oggi · ' + g + ' ' + m.slice(0, 3).toLowerCase();
  if (iso === isoData(new Date(Date.now() - 864e5))) return 'Ieri · ' + g + ' ' + m.slice(0, 3).toLowerCase();
  return g + ' ' + m.toLowerCase();
}

export function eur(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 }).format(n || 0);
}
/* importo con segno: '−12,50 €' / '+12,50 €' */
export function eurSegno(n) {
  return (n >= 0 ? '+' : '−') + eur(Math.abs(n));
}
export function percentuale(parte, tot) {
  return tot ? Math.round((parte / tot) * 100) + '%' : '—';
}
/* accetta sia '12,5' sia '12.5'; NaN se non è un numero */
export function parseImporto(v) {
  return parseFloat(String(v).replace(',', '.'));
}

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
/* iniziali della categoria: 'Spesa settimanale' → 'SS' */
export function sigla(nome) {
  const p = String(nome).split(/[\s/]+/);
  return (p.length > 1 ? p[0][0] + p[1][0] : String(nome).slice(0, 2)).toUpperCase();
}
