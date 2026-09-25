import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiVuoti } from '../src/core/dati.js';
import {
  colore, escluse, delMese, dellAnno, totale, uscitePerCategoria, riepilogo, daRimborsare, righeBudget,
  budgetDi, meseBudgetPrecedente, totaleBudget, inAttesaDiRimborso, categoriaConRuolo
} from '../src/core/calcoli.js';

const mv = (tipo, data, importo, categoria, extra) => ({ id: data + categoria, tipo, data, importo, categoria, ...extra });

function esempio() {
  const d = datiVuoti();
  d.movimenti = [
    mv('entrata', '2026-09-01', 2000, 'Stipendio'),
    mv('entrata', '2026-09-05', 160, 'Buoni pasto'),
    mv('uscita', '2026-09-02', 600, 'Affitto'),
    mv('uscita', '2026-09-03', 100, 'Spesa settimanale'),
    mv('uscita', '2026-09-04', 50, 'Spesa settimanale'),
    mv('uscita', '2026-09-06', 40, 'Da rimborsare', { rimborsato: false }),
    mv('uscita', '2026-09-07', 30, 'Da rimborsare', { rimborsato: true }),
    mv('uscita', '2026-08-30', 999, 'Affitto')
  ];
  d.budget = { '2026-09': { Affitto: 500, 'Spesa settimanale': 200 } };
  return d;
}

test('colore ed esclusioni per tipo', () => {
  const d = esempio();
  assert.equal(colore(d, 'Affitto', 'uscita'), '#4A5C8C');
  assert.equal(colore(d, 'Stipendio', 'entrata'), '#2E7356');
  assert.equal(colore(d, 'Sconosciuta', 'uscita'), '#8A8178');
  assert.ok(escluse(d, 'uscita').includes('Da rimborsare'));
  assert.ok(!escluse(d, 'entrata').includes('Da rimborsare'));
  assert.deepEqual(escluse({}, 'uscita'), []);
});

test('filtri per mese e anno', () => {
  const d = esempio();
  assert.equal(delMese(d.movimenti, '2026-09').length, 7);
  assert.equal(delMese(d.movimenti, '2026-08').length, 1);
  assert.equal(dellAnno(d.movimenti, '2026').length, 8);
});

test('totale: con soloPortafoglio salta le categorie escluse', () => {
  const d = esempio();
  const sett = delMese(d.movimenti, '2026-09');
  assert.equal(totale(d, sett, 'entrata', false), 2160);
  assert.equal(totale(d, sett, 'entrata', true), 2000);
  assert.equal(totale(d, sett, 'uscita', false), 820);
  assert.equal(totale(d, sett, 'uscita', true), 750);
});

test('riepilogo del mese', () => {
  const d = esempio();
  const r = riepilogo(d, delMese(d.movimenti, '2026-09'));
  assert.equal(r.entrate, 2000);
  assert.equal(r.uscite, 750);
  assert.equal(r.rimasto, 1250);
  assert.deepEqual(uscitePerCategoria(r.movs), r.catTot);
  assert.deepEqual(r.catTot, { Affitto: 600, 'Spesa settimanale': 150, 'Da rimborsare': 70 });
  assert.equal(r.tot, 820);
  assert.deepEqual(r.ordinate.map((c) => c.nome), ['Affitto', 'Spesa settimanale', 'Da rimborsare']);
  assert.equal(r.ordinate[0].colore, '#4A5C8C');
});

test('riepilogo separa le categorie del portafoglio da quelle escluse', () => {
  const d = esempio();
  const r = riepilogo(d, delMese(d.movimenti, '2026-09'));
  assert.deepEqual(r.portafoglio.map((c) => c.nome), ['Affitto', 'Spesa settimanale']);
  assert.deepEqual(r.fuori.map((c) => c.nome), ['Da rimborsare']);
  // il centro della ciambella (uscite) è la somma della legenda del portafoglio
  assert.equal(r.portafoglio.reduce((s, c) => s + c.val, 0), r.uscite);
});

test('daRimborsare conta solo le uscite non ancora rimborsate', () => {
  const d = esempio();
  assert.equal(daRimborsare(d, d.movimenti), 40);
});

test('il rimborso segue la categoria anche dopo una rinomina', () => {
  const d = esempio();
  const c = categoriaConRuolo(d, 'uscita', 'rimborso');
  c.nome = 'Anticipi';
  d.movimenti.forEach((m) => { if (m.categoria === 'Da rimborsare') m.categoria = 'Anticipi'; });
  assert.equal(daRimborsare(d, d.movimenti), 40);
  assert.equal(inAttesaDiRimborso(d, { tipo: 'uscita', categoria: 'Da rimborsare' }), false);
  assert.equal(categoriaConRuolo(d, 'entrata', 'rimborso'), undefined);
});

test('righeBudget: barra piena e rossa quando si sfora', () => {
  const d = esempio();
  const righe = righeBudget(d, '2026-09', riepilogo(d, delMese(d.movimenti, '2026-09')).catTot);
  assert.equal(righe.length, d.categorie.uscite.length);
  const [affitto, spesa] = righe;
  assert.deepEqual(
    { nome: affitto.nome, speso: affitto.speso, bud: affitto.bud, diff: affitto.diff, w: affitto.w, barColore: affitto.barColore },
    { nome: 'Affitto', speso: 600, bud: 500, diff: -100, w: '100.0%', barColore: '#C0452B' }
  );
  assert.equal(spesa.nome, 'Spesa settimanale');
  assert.equal(spesa.w, '75.0%');
  assert.equal(spesa.barColore, '#7A8B3F');
  const rimb = righe.find((b) => b.nome === 'Da rimborsare');
  assert.equal(rimb.w, '100.0%'); // speso senza budget
  assert.equal(righe.find((b) => b.nome === 'Viaggi').w, '0.0%');
});

test('budgetDi: il mese così com\'è, l\'anno come somma dei mesi', () => {
  const d = esempio();
  d.budget['2026-08'] = { Affitto: 500, Svago: 50 };
  d.budget['2025-12'] = { Affitto: 999 };
  assert.deepEqual(budgetDi(d, '2026-09'), { Affitto: 500, 'Spesa settimanale': 200 });
  assert.deepEqual(budgetDi(d, '2026-10'), {});
  assert.deepEqual(budgetDi(d, '2026'), { Affitto: 1000, 'Spesa settimanale': 200, Svago: 50 });
  const anno = righeBudget(d, '2026', { Affitto: 1599 });
  assert.equal(anno.find((b) => b.nome === 'Affitto').diff, -599);
});

test('meseBudgetPrecedente salta i mesi vuoti e ignora quelli dopo', () => {
  const d = esempio();
  d.budget['2026-07'] = { Affitto: 500 };
  d.budget['2026-08'] = { Affitto: 0 };
  assert.equal(meseBudgetPrecedente(d, '2026-10'), '2026-09');
  assert.equal(meseBudgetPrecedente(d, '2026-09'), '2026-07');
  assert.equal(meseBudgetPrecedente(d, '2026-07'), null);
});

test('totaleBudget conta solo le categorie con un importo', () => {
  assert.deepEqual(totaleBudget({ Affitto: 620, Svago: 0, Bollette: 150 }), { categorie: 2, totale: 770 });
  assert.deepEqual(totaleBudget({}), { categorie: 0, totale: 0 });
});
