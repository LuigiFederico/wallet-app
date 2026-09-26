/* Cartella di lavoro .xlsx come il modello Excel originale:
   un foglio per mese (uscite a sinistra, entrate a destra) più il Riepilogo per categoria. */

import { MESI, SIGLE } from '../core/costanti.js';
import { chiaveMese } from '../core/formato.js';
import { delMese } from '../core/calcoli.js';
import { zip } from './zip.js';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function xe(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }

function foglioXml(righe) {
  const rows = righe.map((r, i) => {
    const cells = r.map((v, j) => {
      const ref = String.fromCharCode(65 + j) + (i + 1);
      return typeof v === 'number'
        ? '<c r="' + ref + '"><v>' + v + '</v></c>'
        : '<c r="' + ref + '" t="inlineStr"><is><t>' + xe(v) + '</t></is></c>';
    }).join('');
    return '<row r="' + (i + 1) + '">' + cells + '</row>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + rows + '</sheetData></worksheet>';
}

const perData = (a, b) => (a.data < b.data ? -1 : 1);

function foglioMese(movimenti, mese) {
  const movs = delMese(movimenti, mese).slice().sort(perData);
  const righe = [['USCITE', '', '', '', '', 'ENTRATE', '', '', ''], ['Data','Importo','Categoria','Descrizione','','Data','Importo','Categoria','Descrizione']];
  const us = movs.filter((m) => m.tipo === 'uscita'), en = movs.filter((m) => m.tipo === 'entrata');
  for (let r = 0; r < Math.max(us.length, en.length); r++) {
    const u = us[r], e = en[r];
    righe.push([
      u ? u.data : '', u ? u.importo : '', u ? u.categoria : '', u ? (u.descrizione || '') : '', '',
      e ? e.data : '', e ? e.importo : '', e ? e.categoria : '', e ? (e.descrizione || '') : ''
    ]);
  }
  return righe;
}

function foglioRiepilogo(dati, anno) {
  const righe = [['Categoria', ...SIGLE.map((s) => s + ' ' + anno), 'Totale']];
  dati.categorie.uscite.forEach((c) => {
    const vals = MESI.map((_, i) => delMese(dati.movimenti, chiaveMese(anno, i))
      .filter((m) => m.tipo === 'uscita' && m.categoria === c.nome).reduce((s, m) => s + m.importo, 0));
    righe.push([c.nome, ...vals, vals.reduce((a, b) => a + b, 0)]);
  });
  return righe;
}

/* L'anno esportato è il più recente con movimenti (o quello corrente). */
export function annoDaEsportare(movimenti) {
  const anni = [...new Set(movimenti.map((m) => m.data.slice(0, 4)))].sort();
  return anni.length ? anni[anni.length - 1] : String(new Date().getFullYear());
}

export function xlsx(dati) {
  const anno = annoDaEsportare(dati.movimenti);
  const fogli = MESI.map((nome, i) => ({ nome, righe: foglioMese(dati.movimenti, chiaveMese(anno, i)) }));
  fogli.push({ nome: 'Riepilogo', righe: foglioRiepilogo(dati, anno) });

  const sheets = fogli.map((f, i) => '<sheet name="' + xe(f.nome) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('');
  const rels = fogli.map((f, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('');
  const overrides = fogli.map((f, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('');

  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + overrides + '</Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets + '</sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>' }
  ];
  fogli.forEach((f, i) => files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: foglioXml(f.righe) }));
  return { nome: 'butterflies-' + anno + '.xlsx', blob: zip(files, MIME_XLSX) };
}
