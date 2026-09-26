import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  datiVuoti, normalizza, bozzaPronta, movimentoDaBozza, bozzaDaMovimento, nomeBackup,
  erroreNomeCategoria, aggiungiCategoria, modificaCategoria, usoCategoria, eliminaCategoria
} from '../src/core/dati.js';

test('datiVuoti ha categorie ed esclusioni del modello Excel', () => {
  const d = datiVuoti();
  assert.equal(d.versione, 2);
  assert.equal(d.categorie.uscite.length, 19);
  assert.equal(d.categorie.entrate.length, 5);
  assert.deepEqual(d.escludiDaPortafoglio.uscite, ['Buoni pasto', 'Da rimborsare', 'Investimenti']);
  assert.deepEqual(d.movimenti, []);
  assert.deepEqual(d.categorie.uscite.find((c) => c.nome === 'Da rimborsare'), { nome: 'Da rimborsare', colore: '#A8863C', ruolo: 'rimborso' });
  assert.equal(d.categorie.entrate.find((c) => c.nome === 'Investimenti').ruolo, 'investimenti');
  assert.equal('ruolo' in d.categorie.uscite.find((c) => c.nome === 'Altro'), false);
});

test('normalizza dà i ruoli alle categorie dei file versione 1, una volta sola', () => {
  const v1 = {
    versione: 1,
    categorie: { uscite: [{ nome: 'Affitto', colore: '#1' }, { nome: 'Da rimborsare', colore: '#2' }], entrate: [{ nome: 'Buoni pasto', colore: '#3' }] }
  };
  const d = normalizza(v1);
  assert.equal(d.versione, 2);
  assert.deepEqual(d.categorie.uscite.map((c) => c.ruolo), [undefined, 'rimborso']);
  assert.equal(d.categorie.entrate[0].ruolo, 'buoniPasto');
  // in un file versione 2 un nome predefinito non riprende il ruolo (es. categoria ricreata dopo averla eliminata)
  const v2 = normalizza({ versione: 2, categorie: { uscite: [{ nome: 'Da rimborsare', colore: '#2' }], entrate: [] } });
  assert.equal(v2.categorie.uscite[0].ruolo, undefined);
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
  const m = movimentoDaBozza(datiVuoti(), { tipo: 'uscita', data: '', importo: '12,345', categoria: 'Da rimborsare', descrizione: '' });
  assert.deepEqual(m, {
    id: 'm' + new Date(2026, 8, 18, 10).getTime(), tipo: 'uscita', data: '2026-09-18',
    importo: 12.35, categoria: 'Da rimborsare', descrizione: 'Da rimborsare', rimborsato: false
  });
  const e = movimentoDaBozza(datiVuoti(), { tipo: 'entrata', data: '2026-01-02', importo: '100', categoria: 'Stipendio', descrizione: 'Gennaio' });
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

const mv = (tipo, categoria, extra) => ({ id: tipo + categoria, tipo, data: '2026-09-01', importo: 10, categoria, descrizione: categoria, ...extra });

test('erroreNomeCategoria: vuoto o doppione nello stesso tipo', () => {
  const d = datiVuoti();
  assert.equal(erroreNomeCategoria(d, 'uscita', 'Palestra'), '');
  assert.ok(erroreNomeCategoria(d, 'uscita', '  '));
  assert.ok(erroreNomeCategoria(d, 'uscita', 'affitto'));
  assert.equal(erroreNomeCategoria(d, 'entrata', 'Affitto'), ''); // tipi indipendenti
  assert.equal(erroreNomeCategoria(d, 'uscita', 'AFFITTO', 'Affitto'), ''); // la categoria che si modifica
});

test('aggiungiCategoria mette la categoria nel suo tipo', () => {
  const d = datiVuoti();
  aggiungiCategoria(d, 'entrata', ' Bonus ', '#7A8B3F');
  assert.deepEqual(d.categorie.entrate.at(-1), { nome: 'Bonus', colore: '#7A8B3F' });
  assert.equal(d.categorie.uscite.length, 19);
});

test('modificaCategoria rinomina movimenti, budget ed esclusioni solo del suo tipo', () => {
  const d = datiVuoti();
  d.movimenti = [mv('uscita', 'Investimenti'), mv('entrata', 'Investimenti'), mv('uscita', 'Investimenti', { descrizione: 'ETF' })];
  d.budget = { '2026-08': { Investimenti: 100 }, '2026-09': { Investimenti: 200, Affitto: 500 } };
  modificaCategoria(d, 'uscita', 'Investimenti', 'Risparmi', '#2B6B5D');
  assert.deepEqual(d.movimenti.map((m) => [m.categoria, m.descrizione]), [['Risparmi', 'Risparmi'], ['Investimenti', 'Investimenti'], ['Risparmi', 'ETF']]);
  assert.deepEqual(d.budget, { '2026-08': { Risparmi: 100 }, '2026-09': { Affitto: 500, Risparmi: 200 } });
  assert.ok(d.escludiDaPortafoglio.uscite.includes('Risparmi'));
  assert.ok(d.escludiDaPortafoglio.entrate.includes('Investimenti'));
  const c = d.categorie.uscite.find((x) => x.nome === 'Risparmi');
  assert.equal(c.ruolo, 'investimenti'); // il comportamento segue la categoria
  modificaCategoria(d, 'uscita', 'Risparmi', 'Risparmi', '#8A8178');
  assert.equal(c.colore, '#8A8178');
});

test('eliminaCategoria sposta i movimenti e somma i budget alla destinazione', () => {
  const d = datiVuoti();
  d.movimenti = [mv('uscita', 'Pedaggi auto'), mv('entrata', 'Altro'), mv('uscita', 'Da rimborsare', { rimborsato: true })];
  d.budget = { '2026-08': { 'Pedaggi auto': 30 }, '2026-09': { 'Pedaggi auto': 20, Automobile: 100 } };
  assert.deepEqual(usoCategoria(d, 'uscita', 'Pedaggi auto'), { movimenti: 1, budget: true });
  eliminaCategoria(d, 'uscita', 'Pedaggi auto', 'Automobile');
  assert.equal(d.categorie.uscite.some((c) => c.nome === 'Pedaggi auto'), false);
  assert.deepEqual([d.movimenti[0].categoria, d.movimenti[0].descrizione], ['Automobile', 'Pedaggi auto']);
  assert.deepEqual(d.budget, { '2026-08': { Automobile: 30 }, '2026-09': { Automobile: 120 } });

  // da e verso "Da rimborsare": la spunta rimborsato segue la destinazione
  d.movimenti.push(mv('uscita', 'Regali'));
  eliminaCategoria(d, 'uscita', 'Regali', 'Da rimborsare');
  assert.equal(d.movimenti.at(-1).rimborsato, false);
  eliminaCategoria(d, 'uscita', 'Da rimborsare', 'Altro');
  assert.equal(d.movimenti.filter((m) => 'rimborsato' in m).length, 0);
  assert.equal(d.escludiDaPortafoglio.uscite.includes('Da rimborsare'), false);
  assert.equal(d.movimenti[1].categoria, 'Altro'); // l'entrata "Altro" non si tocca
});

test('eliminaCategoria senza movimenti né budget', () => {
  const d = datiVuoti();
  d.budget = { '2026-09': { Viaggi: 0 } };
  assert.deepEqual(usoCategoria(d, 'uscita', 'Viaggi'), { movimenti: 0, budget: false });
  eliminaCategoria(d, 'uscita', 'Viaggi');
  assert.deepEqual(d.budget, { '2026-09': {} });
  assert.equal(d.categorie.uscite.length, 18);
});
