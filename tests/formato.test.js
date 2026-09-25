import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isoData, chiaveMese, nomeMese, giorniNelMese, spostaChiaveMese, dataBreve, etichettaData,
  eur, eurEsatto, eurSegno, percentuale, parseImporto, esc, sigla, ieriISO, orarioBreve, quando, meseInFrase
} from '../src/core/formato.js';

// Intl usa lo spazio unificatore tra importo e simbolo
const n = (s) => s.replace(/ /g, ' ');

test('date ISO e chiavi mese', () => {
  assert.equal(isoData(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(chiaveMese('2026', 8), '2026-09');
  assert.equal(nomeMese('2026-09'), 'Settembre 2026');
  assert.equal(giorniNelMese('2026-02'), 28);
  assert.equal(giorniNelMese('2028-02'), 29);
  assert.equal(dataBreve('2026-09-18'), '18 set');
});

test('spostaChiaveMese attraversa il cambio anno', () => {
  assert.equal(spostaChiaveMese('2026-01', -1), '2025-12');
  assert.equal(spostaChiaveMese('2026-12', 1), '2027-01');
  assert.equal(spostaChiaveMese('2026-05', 1), '2026-06');
});

test('etichettaData: oggi, ieri, altri giorni', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 8, 18, 10) });
  assert.equal(etichettaData('2026-09-18'), 'Oggi · 18 set');
  assert.equal(etichettaData('2026-09-17'), 'Ieri · 17 set');
  assert.equal(etichettaData('2026-09-16'), '16 settembre');
});

test('eur: decimali solo sotto i 1000', () => {
  assert.equal(n(eur(42.5)), '42,50 €');
  assert.equal(n(eur(1234.56)), '1.235 €');
  assert.equal(n(eur(undefined)), '0,00 €');
  assert.equal(n(eurSegno(-12.5)), '−12,50 €');
  assert.equal(n(eurSegno(0)), '+0,00 €');
});

test('percentuale e parseImporto', () => {
  assert.equal(percentuale(1, 4), '25%');
  assert.equal(percentuale(1, 0), '—');
  assert.equal(parseImporto('12,5'), 12.5);
  assert.equal(parseImporto('12.5'), 12.5);
  assert.ok(Number.isNaN(parseImporto('')));
});

test('parseImporto: punto delle migliaia e input non validi', () => {
  assert.equal(parseImporto('1.200'), 1200);
  assert.equal(parseImporto('1.234,50'), 1234.5);
  assert.equal(parseImporto('12.345.678'), 12345678);
  assert.equal(parseImporto(' 42,5 € '), 42.5);
  assert.equal(parseImporto('0,5'), 0.5);
  assert.equal(parseImporto(620), 620);
  assert.ok(Number.isNaN(parseImporto('12abc')));
  assert.ok(Number.isNaN(parseImporto('1,2,3')));
  assert.ok(Number.isNaN(parseImporto('-5')));
});

test('meseInFrase aggiunge l\'anno solo se è diverso', () => {
  assert.equal(meseInFrase('2026-08', '2026-09'), 'agosto');
  assert.equal(meseInFrase('2025-12', '2026-01'), 'dicembre 2025');
});

test('eurEsatto tiene sempre i centesimi', () => {
  assert.equal(n(eurEsatto(1200)), '1.200,00 €');
  assert.equal(n(eurEsatto(42.5)), '42,50 €');
});

test('orari dei salvataggi', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 8, 25, 18, 0) });
  assert.equal(ieriISO(), '2026-09-24');
  assert.equal(orarioBreve(new Date(2026, 8, 25, 14, 32).toISOString()), '14:32');
  assert.equal(orarioBreve(new Date(2026, 8, 12, 9, 14).toISOString()), '12 set');
  assert.equal(quando(new Date(2026, 8, 25, 14, 32).getTime()), 'oggi alle 14:32');
  assert.equal(quando(new Date(2026, 8, 12, 9, 14).toISOString()), 'il 12 set alle 09:14');
});

test('esc e sigla', () => {
  assert.equal(esc('<b>"A" & \'B\'</b>'), '&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;');
  assert.equal(esc(null), '');
  assert.equal(sigla('Spesa settimanale'), 'SS');
  assert.equal(sigla('Tasse/Commissioni'), 'TC');
  assert.equal(sigla('Affitto'), 'AF');
});
