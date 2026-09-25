import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isoData, chiaveMese, nomeMese, giorniNelMese, spostaChiaveMese, dataBreve, etichettaData,
  eur, eurSegno, percentuale, parseImporto, esc, sigla
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
  assert.equal(n(eur(1234.56)), '1235 €');
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

test('esc e sigla', () => {
  assert.equal(esc('<b>"A" & \'B\'</b>'), '&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;');
  assert.equal(esc(null), '');
  assert.equal(sigla('Spesa settimanale'), 'SS');
  assert.equal(sigla('Tasse/Commissioni'), 'TC');
  assert.equal(sigla('Affitto'), 'AF');
});
