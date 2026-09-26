/* Formattazione di date, importi e testo. Nessuna dipendenza dallo stato. */

import { MESI, SIGLE } from './costanti.js';

/* Date come stringhe ISO locali: 'AAAA-MM-GG' per i giorni, 'AAAA-MM' per i mesi. */

export function isoData(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function oggiISO() {
  return isoData(new Date());
}
export function ieriISO() {
  return isoData(new Date(Date.now() - 864e5));
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
/* 'Set 2026' (barra in alto) */
export function nomeMeseBreve(mese) {
  return MESI[indiceMese(mese)].slice(0, 3) + ' ' + mese.slice(0, 4);
}
/* nome del mese dentro una frase: 'agosto', oppure 'dicembre 2025' se l'anno è diverso da quello di riferimento */
export function meseInFrase(mese, riferimento) {
  const m = MESI[indiceMese(mese)].toLowerCase();
  return mese.slice(0, 4) === riferimento.slice(0, 4) ? m : m + ' ' + mese.slice(0, 4);
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
  if (iso === ieriISO()) return 'Ieri · ' + g + ' ' + m.slice(0, 3).toLowerCase();
  return g + ' ' + m.toLowerCase();
}

/* l'italiano non raggruppa le 4 cifre ('2150 €'): useGrouping 'always' dà '2.150 €' */
export function eur(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2, useGrouping: 'always' }).format(n || 0);
}
/* sempre con i centesimi: '1.200,00 €' */
export function eurEsatto(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' }).format(n || 0);
}
/* importo con segno: '−12,50 €' / '+12,50 €' */
export function eurSegno(n) {
  return (n >= 0 ? '+' : '−') + eur(Math.abs(n));
}
export function percentuale(parte, tot) {
  return tot ? Math.round((parte / tot) * 100) + '%' : '—';
}
/* accetta '12,5', '12.5', '1.200' e '1.234,50' (punto delle migliaia); NaN se non è un numero */
export function parseImporto(v) {
  let s = String(v).replace(/[\s€]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return /^(\d+(\.\d*)?|\.\d+)$/.test(s) ? parseFloat(s) : NaN;
}

function oraMinuti(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
/* istante di un salvataggio: '14:32' se è di oggi, altrimenti '12 set' */
export function orarioBreve(ts) {
  const d = new Date(ts), g = isoData(d);
  return g === oggiISO() ? oraMinuti(d) : dataBreve(g);
}
/* 'oggi alle 14:32', 'il 12 set alle 09:14' */
export function quando(ts) {
  const d = new Date(ts), g = isoData(d);
  return (g === oggiISO() ? 'oggi' : 'il ' + dataBreve(g)) + ' alle ' + oraMinuti(d);
}

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
/* iniziali della categoria: 'Spesa settimanale' → 'SS' */
export function sigla(nome) {
  const p = String(nome).split(/[\s/]+/);
  return (p.length > 1 ? p[0][0] + p[1][0] : String(nome).slice(0, 2)).toUpperCase();
}
