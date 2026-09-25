import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiVuoti } from '../src/core/dati.js';
import { csv } from '../src/export/csv.js';
import { crc32, zip } from '../src/export/zip.js';
import { xlsx, annoDaEsportare } from '../src/export/xlsx.js';

const movimenti = [
  { id: 'b', tipo: 'uscita', data: '2026-09-02', importo: 12.5, categoria: 'Da rimborsare', descrizione: 'Cena', rimborsato: true },
  { id: 'a', tipo: 'entrata', data: '2026-09-01', importo: 2000, categoria: 'Stipendio', descrizione: '' }
];

test('csv: BOM, separatore ; e virgola decimale, ordinato per data', () => {
  assert.equal(csv(movimenti),
    '﻿Data;Tipo;Importo;Categoria;Descrizione;Rimborsato\r\n'
    + '2026-09-01;entrata;2000;Stipendio;;\r\n'
    + '2026-09-02;uscita;12,5;Da rimborsare;Cena;sì');
});

test('crc32 sul vettore di controllo standard', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
});

/* legge la central directory di uno zip e restituisce i nomi dei file */
async function nomiNelloZip(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const dv = new DataView(buf.buffer);
  const eocd = buf.length - 22;
  assert.equal(dv.getUint32(eocd, true), 0x06054b50);
  const n = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const nomi = [];
  for (let i = 0; i < n; i++) {
    assert.equal(dv.getUint32(p, true), 0x02014b50);
    const len = dv.getUint16(p + 28, true);
    nomi.push(new TextDecoder().decode(buf.subarray(p + 46, p + 46 + len)));
    p += 46 + len;
  }
  return nomi;
}

test('zip: struttura valida', async () => {
  const blob = zip([{ name: 'a.txt', data: 'ciao' }, { name: 'è.txt', data: 'x' }], 'application/zip');
  assert.equal(blob.type, 'application/zip');
  assert.deepEqual(await nomiNelloZip(blob), ['a.txt', 'è.txt']);
});

test('xlsx: un foglio per mese più il riepilogo, anno più recente', async () => {
  const d = datiVuoti();
  d.movimenti = [...movimenti, { id: 'c', tipo: 'uscita', data: '2025-03-01', importo: 1, categoria: 'Altro' }];
  assert.equal(annoDaEsportare(d.movimenti), '2026');
  const { nome, blob } = xlsx(d);
  assert.equal(nome, 'butterflies-2026.xlsx');
  const nomi = await nomiNelloZip(blob);
  assert.equal(nomi.filter((f) => f.startsWith('xl/worksheets/')).length, 13);
  assert.ok(nomi.includes('xl/workbook.xml'));
  assert.ok(nomi.includes('[Content_Types].xml'));
});
