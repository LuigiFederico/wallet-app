import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiVuoti, normalizza, bozzaPronta, movimentoDaBozza, bozzaDaMovimento, nomeBackup } from '../src/core/dati.js';

test('datiVuoti ha categorie ed esclusioni del modello Excel', () => {
  const d = datiVuoti();
  assert.equal(d.versione, 1);
  assert.equal(d.categorie.uscite.length, 19);
  assert.equal(d.categorie.entrate.length, 5);
  assert.deepEqual(d.escludiDaPortafoglio.uscite, ['Buoni pasto', 'Da rimborsare', 'Investimenti']);
  assert.deepEqual(d.movimenti, []);
});

test('normalizza completa i campi mancanti e mantiene quelli presenti', () => {
  const d = normalizza({ movimenti: [{ id: 'a' }], budget: null, extra: 1 });
  assert.deepEqual(d.movimenti, [{ id: 'a' }]);
  assert.deepEqual(d.budget, {});
  assert.equal(d.extra, 1);
  assert.equal(d.categorie.uscite.length, 19);

  assert.deepEqual(normalizza(null).movimenti, []);
  assert.deepEqual(normalizza({ movimenti: 'rotto' }).movimenti, []);
  assert.equal(normalizza({ categorie: {} }).categorie.uscite.length, 19);
  assert.deepEqual(normalizza({ escludiDaPortafoglio: null }).escludiDaPortafoglio.entrate, ['Buoni pasto', 'Investimenti']);
});

test('bozzaPronta richiede categoria e importo positivo', () => {
  assert.equal(bozzaPronta({ categoria: 'Svago', importo: '3,5' }), true);
  assert.equal(bozzaPronta({ categoria: '', importo: '3,5' }), false);
  assert.equal(bozzaPronta({ categoria: 'Svago', importo: '0' }), false);
  assert.equal(bozzaPronta({ categoria: 'Svago', importo: 'abc' }), false);
});

test('movimentoDaBozza arrotonda, usa la categoria come descrizione e segna i rimborsi', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 8, 18, 10) });
  const m = movimentoDaBozza({ tipo: 'uscita', data: '', importo: '12,345', categoria: 'Da rimborsare', descrizione: '' });
  assert.deepEqual(m, {
    id: 'm' + new Date(2026, 8, 18, 10).getTime(), tipo: 'uscita', data: '2026-09-18',
    importo: 12.35, categoria: 'Da rimborsare', descrizione: 'Da rimborsare', rimborsato: false
  });
  const e = movimentoDaBozza({ tipo: 'entrata', data: '2026-01-02', importo: '100', categoria: 'Stipendio', descrizione: 'Gennaio' });
  assert.equal('rimborsato' in e, false);
  assert.equal(e.descrizione, 'Gennaio');
});

test('bozzaDaMovimento riporta il movimento nel form', () => {
  const m = { id: 'm1', tipo: 'uscita', data: '2026-09-18', importo: 42.5, categoria: 'Svago', descrizione: 'Cinema' };
  assert.deepEqual(bozzaDaMovimento(m), { id: 'm1', tipo: 'uscita', data: '2026-09-18', importo: '42,5', categoria: 'Svago', descrizione: 'Cinema' });
  // la descrizione di default (= categoria) torna vuota, così resta facoltativa
  assert.equal(bozzaDaMovimento({ ...m, descrizione: 'Svago' }).descrizione, '');
  assert.equal(bozzaPronta(bozzaDaMovimento(m)), true);
});

test('nomeBackup mette la data accanto al nome del file', () => {
  assert.equal(nomeBackup('2026-09-25'), 'wallet-data.backup-2026-09-25.json');
});
