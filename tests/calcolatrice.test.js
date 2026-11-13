import { test } from 'node:test';
import assert from 'node:assert/strict';
import { premi, calcola, haOperazioni, importoDaCalcolo, MAX_IMPORTO } from '../src/core/calcolatrice.js';
import { parseImporto } from '../src/core/formato.js';

const scrivi = (tasti) => [...tasti].reduce((c, t) => premi(c, t), '');

test('premi: cifre, virgola e cancellazione', () => {
  assert.equal(scrivi('12,5'), '12,5');
  assert.equal(scrivi(',5'), '0,5');
  assert.equal(scrivi('1,234'), '1,23'); // al massimo due decimali
  assert.equal(scrivi('1,2,3'), '1,23'); // una sola virgola per numero
  assert.equal(scrivi('0007'), '7'); // niente zeri iniziali
  assert.equal(scrivi('123456789'), '1234567'); // al massimo sette cifre intere
  assert.equal(scrivi('12⌫'), '1');
  assert.equal(premi('', '⌫'), '');
});

test('premi: operatori', () => {
  assert.equal(scrivi('+5'), '5'); // non si comincia con un operatore
  assert.equal(scrivi('12+−3'), '12−3'); // un operatore sostituisce il precedente
  assert.equal(scrivi('12,+'), '12+'); // la virgola rimasta sola sparisce
  assert.equal(scrivi('1+,5'), '1+0,5');
  assert.equal(premi('12', 'x'), '12'); // tasti sconosciuti ignorati
});

test('calcola: precedenza, arrotondamento e casi limite', () => {
  assert.equal(calcola('12,5+8'), 20.5);
  assert.equal(calcola('12,5+8×2'), 28.5);
  assert.equal(calcola('100−20×2÷4'), 90);
  assert.equal(calcola('0,1+0,2'), 0.3);
  assert.equal(calcola('10÷3'), 3.33);
  assert.equal(calcola('5−8'), -3);
  assert.equal(calcola('12+'), 12); // l'operatore in fondo non conta
  assert.ok(Number.isNaN(calcola('')));
  assert.ok(Number.isNaN(calcola('10÷0')));
  assert.equal(calcola('10÷0,5'), 20);
  assert.equal(calcola('0,5×2,01'), 1.01); // 1,005 in binario è 1,00499…: arrotonda comunque in su
  assert.equal(calcola('1,005×1'), 1.01);
  assert.equal(calcola('1÷3000000'), 0);
});

test('haOperazioni: solo con un operatore seguito da qualcosa', () => {
  assert.equal(haOperazioni('12'), false);
  assert.equal(haOperazioni('12+'), false);
  assert.equal(haOperazioni('12+3'), true);
  assert.equal(haOperazioni(''), false);
});

test('importoDaCalcolo: stringa letta da parseImporto, vuota se non positiva', () => {
  assert.equal(importoDaCalcolo('12,5+8'), '20,50');
  assert.equal(importoDaCalcolo('1000×1000'), '1000000,00');
  assert.equal(parseImporto(importoDaCalcolo('1000×1000')), 1000000);
  assert.equal(parseImporto(importoDaCalcolo(String(MAX_IMPORTO).replace('.', ','))), MAX_IMPORTO);
  assert.equal(importoDaCalcolo('5−8'), '');
  assert.equal(importoDaCalcolo('5−5'), '');
  assert.equal(importoDaCalcolo('10÷0'), '');
  assert.equal(importoDaCalcolo(''), '');
  assert.equal(importoDaCalcolo('9999999,99'), '9999999,99');
  assert.equal(importoDaCalcolo('9999999×2'), ''); // oltre il massimo
  assert.equal(importoDaCalcolo('9999999×9999999×9999999'), '');
  assert.equal(importoDaCalcolo('42,5'), '42,50'); // in modifica il calcolo parte dall'importo salvato
});
