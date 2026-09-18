/* Butterflies in the wallet — PWA
   Dati in wallet-data.json, scritto direttamente nella cartella scelta
   tramite File System Access API (Chrome Android / desktop).
   Fallback: localStorage + export manuale. */

'use strict';

/* ---------- costanti ---------- */

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const SIGLE = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
const FILENAME = 'wallet-data.json';
const LS_KEY = 'butterflies-wallet-data';

const CAT_USCITE = [
  ['Spesa settimanale','#7A8B3F'], ['Affitto','#4A5C8C'], ['Bollette','#3E8391'],
  ['Tasse/Commissioni','#6E6A63'], ['Abbonamenti','#7B4BC4'], ['Spese mediche','#B0435A'],
  ['Trasporti','#2E7356'], ['Svago','#C4763B'], ['Viaggi','#2F6E8F'], ['Regali','#B44A86'],
  ['Spese personali','#8E5BA6'], ['Cibo asporto/ristorante','#C0452B'], ['Automobile','#5A5F6B'],
  ['Carburante','#A45A2A'], ['Pedaggi auto','#86714E'], ['Buoni pasto','#B8801C'],
  ['Da rimborsare','#A8863C'], ['Investimenti','#2B6B5D'], ['Altro','#8A8178']
];
const CAT_ENTRATE = [
  ['Stipendio','#2E7356'], ['Rimborsi','#5B4BC4'], ['Investimenti','#2B6B5D'],
  ['Buoni pasto','#B8801C'], ['Altro','#8A8178']
];

function datiVuoti() {
  return {
    versione: 1,
    valuta: 'EUR',
    aggiornato: new Date().toISOString(),
    escludiDaPortafoglio: { uscite: ['Buoni pasto','Da rimborsare','Investimenti'], entrate: ['Buoni pasto','Investimenti'] },
    categorie: {
      uscite: CAT_USCITE.map(([nome, colore]) => ({ nome, colore })),
      entrate: CAT_ENTRATE.map(([nome, colore]) => ({ nome, colore }))
    },
    budget: {},
    movimenti: []
  };
}

/* ---------- stato ---------- */

const S = {
  dati: datiVuoti(),
  tab: 'casa',
  mese: oggiISO().slice(0, 7),
  vista: 'mese',
  filtro: 'Tutti',
  query: '',
  tutteCategorie: false,
  dirHandle: null,
  salvato: 'mai',
  scrivo: false,
  bozza: null,
  dettaglio: null,
  annullaSnapshot: null
};

/* ---------- utilità ---------- */

function oggiISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function eur(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 }).format(n || 0);
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function sigla(nome) {
  const p = String(nome).split(/[\s/]+/);
  return (p.length > 1 ? p[0][0] + p[1][0] : String(nome).slice(0, 2)).toUpperCase();
}
function colore(nome, tipo) {
  const lista = tipo === 'entrata' ? S.dati.categorie.entrate : S.dati.categorie.uscite;
  const c = lista.find((x) => x.nome === nome);
  return c ? c.colore : '#8A8178';
}
function escluse(tipo) {
  const e = S.dati.escludiDaPortafoglio || { uscite: [], entrate: [] };
  return (tipo === 'entrata' ? e.entrate : e.uscite) || [];
}
function delMese(mese) { return S.dati.movimenti.filter((m) => m.data.slice(0, 7) === mese); }
function totale(movs, tipo, soloPortafoglio) {
  const ex = escluse(tipo);
  return movs.filter((m) => m.tipo === tipo && (!soloPortafoglio || ex.indexOf(m.categoria) < 0))
    .reduce((s, m) => s + m.importo, 0);
}
function etichettaData(iso) {
  const g = iso.slice(8), m = MESI[parseInt(iso.slice(5, 7), 10) - 1];
  const oggi = oggiISO();
  if (iso === oggi) return 'Oggi · ' + g + ' ' + m.slice(0, 3).toLowerCase();
  const ieri = new Date(Date.now() - 864e5);
  const iy = ieri.getFullYear() + '-' + String(ieri.getMonth() + 1).padStart(2, '0') + '-' + String(ieri.getDate()).padStart(2, '0');
  if (iso === iy) return 'Ieri · ' + g + ' ' + m.slice(0, 3).toLowerCase();
  return g + ' ' + m.toLowerCase();
}

/* ---------- persistenza: IndexedDB per l'handle della cartella ---------- */

function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('butterflies-fs', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('handles', mode);
      const out = fn(tx.objectStore('handles'));
      tx.oncomplete = () => { db.close(); resolve(out && out.result !== undefined ? out.result : out); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}
const salvaHandle = (h) => idb('readwrite', (st) => st.put(h, 'dir'));
const leggiHandle = () => idb('readonly', (st) => st.get('dir'));
const scordaHandle = () => idb('readwrite', (st) => st.delete('dir'));

const supportaFS = typeof window.showDirectoryPicker === 'function';

async function scegliCartella() {
  try {
    const h = await window.showDirectoryPicker({ id: 'wallet', mode: 'readwrite', startIn: 'documents' });
    if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
    S.dirHandle = h;
    await salvaHandle(h);
    const esistente = await leggiDalFile();
    if (esistente && Array.isArray(esistente.movimenti)) {
      const n = esistente.movimenti.length;
      if (!S.dati.movimenti.length || confirm('Trovato ' + FILENAME + ' con ' + n + ' movimenti. Vuoi caricarlo? (Annulla = sovrascrivo con i dati attuali)')) {
        S.dati = normalizza(esistente);
      }
    }
    await scrivi();
    toast('Collegato: la cartella ' + h.name + ' ora contiene ' + FILENAME + '.');
    render();
  } catch (e) {
    if (e && e.name !== 'AbortError') toast('Non è stato possibile aprire la cartella.');
  }
}

async function leggiDalFile() {
  if (!S.dirHandle) return null;
  try {
    const fh = await S.dirHandle.getFileHandle(FILENAME);
    const txt = await (await fh.getFile()).text();
    return JSON.parse(txt);
  } catch (e) { return null; }
}

async function scrivi() {
  S.dati.aggiornato = new Date().toISOString();
  const json = JSON.stringify(S.dati, null, 1);
  try { localStorage.setItem(LS_KEY, json); } catch (e) {}
  if (!S.dirHandle) { S.salvato = 'solo su questo telefono'; return; }
  try {
    S.scrivo = true; pennello();
    const fh = await S.dirHandle.getFileHandle(FILENAME, { create: true });
    const w = await fh.createWritable();
    await w.write(json);
    await w.close();
    S.salvato = 'adesso';
  } catch (e) {
    S.salvato = 'errore di scrittura';
    toast('Scrittura non riuscita: ricollega la cartella dalle impostazioni.');
  } finally {
    S.scrivo = false; pennello();
  }
}

function normalizza(d) {
  const base = datiVuoti();
  const out = Object.assign(base, d || {});
  out.categorie = out.categorie && out.categorie.uscite ? out.categorie : base.categorie;
  out.escludiDaPortafoglio = out.escludiDaPortafoglio || base.escludiDaPortafoglio;
  out.budget = out.budget || {};
  out.movimenti = Array.isArray(out.movimenti) ? out.movimenti : [];
  return out;
}

async function avvia() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { S.dati = normalizza(JSON.parse(raw)); S.salvato = 'solo su questo telefono'; }
  } catch (e) {}

  if (supportaFS) {
    try {
      const h = await leggiHandle();
      if (h) {
        const perm = await h.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          S.dirHandle = h;
          const dal = await leggiDalFile();
          if (dal) { S.dati = normalizza(dal); S.salvato = 'dal file'; }
        } else {
          S.salvato = 'permesso da riattivare';
        }
      }
    } catch (e) {}
  }
  render();
}

/* ---------- toast con annulla ---------- */

let toastTimer = null;
function toast(msg, annulla) {
  const el = document.getElementById('toast');
  el.innerHTML = '<div style="background:#16130F;color:#F7F3EC;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 10px 30px rgba(0,0,0,.25);animation:pop .2s ease">'
    + '<div style="flex:1;font:600 12.5px/1.4 \'Manrope\';text-wrap:pretty">' + esc(msg) + '</div>'
    + (annulla ? '<button id="undo" style="flex:none;font:800 12.5px/1 \'Manrope\';color:#B6A9FF;padding:4px 2px">Annulla</button>' : '')
    + '</div>';
  el.style.display = 'block';
  if (annulla) document.getElementById('undo').onclick = annulla;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; S.annullaSnapshot = null; }, annulla ? 6000 : 3200);
}

/* ---------- mutazioni ---------- */

function snapshot() { S.annullaSnapshot = JSON.stringify(S.dati); }
function annullaUltima() {
  if (!S.annullaSnapshot) return;
  S.dati = JSON.parse(S.annullaSnapshot);
  S.annullaSnapshot = null;
  document.getElementById('toast').style.display = 'none';
  scrivi(); render();
}

function aggiungi(mv) {
  snapshot();
  S.dati.movimenti.unshift(mv);
  S.mese = mv.data.slice(0, 7);
  scrivi(); render();
  toast((mv.tipo === 'uscita' ? 'Uscita' : 'Entrata') + ' di ' + eur(mv.importo) + ' salvata.', annullaUltima);
}
function elimina(id) {
  snapshot();
  S.dati.movimenti = S.dati.movimenti.filter((m) => m.id !== id);
  S.dettaglio = null;
  scrivi(); render();
  toast('Movimento eliminato.', annullaUltima);
}
function duplica(mv) {
  const copia = Object.assign({}, mv, { id: 'm' + Date.now(), data: oggiISO() });
  S.dettaglio = null;
  aggiungi(copia);
}
function toggleRimborso(id) {
  const m = S.dati.movimenti.find((x) => x.id === id);
  if (!m) return;
  m.rimborsato = !m.rimborsato;
  S.dettaglio = m;
  scrivi(); render();
}
function setBudget(nome, val) {
  if (!S.dati.budget[S.mese]) S.dati.budget[S.mese] = {};
  S.dati.budget[S.mese][nome] = Math.max(0, parseFloat(String(val).replace(',', '.')) || 0);
  scrivi();
}
function toggleEsclusione(nome) {
  const e = S.dati.escludiDaPortafoglio;
  ['uscite', 'entrate'].forEach((k) => {
    if (k === 'entrate' && nome === 'Da rimborsare') return;
    const i = (e[k] || []).indexOf(nome);
    if (i >= 0) e[k].splice(i, 1); else e[k].push(nome);
  });
  scrivi(); render();
}
function spostaMese(d) {
  let y = parseInt(S.mese.slice(0, 4), 10), m = parseInt(S.mese.slice(5), 10) + d;
  if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
  S.mese = y + '-' + String(m).padStart(2, '0');
  render();
}

/* ---------- export ---------- */

function scarica(blob, nome) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Esportato ' + nome);
}
function exportJson() {
  scarica(new Blob([JSON.stringify(S.dati, null, 1)], { type: 'application/json' }), FILENAME);
}
function exportCsv() {
  const righe = [['Data','Tipo','Importo','Categoria','Descrizione','Rimborsato']];
  S.dati.movimenti.slice().sort((a, b) => (a.data < b.data ? -1 : 1))
    .forEach((m) => righe.push([m.data, m.tipo, String(m.importo).replace('.', ','), m.categoria, m.descrizione || '', m.rimborsato ? 'sì' : '']));
  scarica(new Blob(['\ufeff' + righe.map((r) => r.join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'movimenti.csv');
}

/* xlsx minimale: zip store-only, un foglio per mese + riepilogo */
function crc32(buf) {
  let c, table = crc32.t;
  if (!table) {
    table = crc32.t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function zip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  files.forEach((f) => {
    const nameB = enc.encode(f.name), dataB = enc.encode(f.data), crc = crc32(dataB);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, dataB.length, true); lh.setUint32(22, dataB.length, true);
    lh.setUint16(26, nameB.length, true);
    parts.push(new Uint8Array(lh.buffer), nameB, dataB);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, dataB.length, true); ch.setUint32(24, dataB.length, true);
    ch.setUint16(28, nameB.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), nameB);
    offset += 30 + nameB.length + dataB.length;
  });
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, files.length, true); eocd.setUint16(10, files.length, true);
  eocd.setUint32(12, cdSize, true); eocd.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(eocd.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
function xe(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }
function foglio(righe) {
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
function exportXlsx() {
  const anni = [...new Set(S.dati.movimenti.map((m) => m.data.slice(0, 4)))].sort();
  const anno = anni.length ? anni[anni.length - 1] : String(new Date().getFullYear());
  const fogli = [];
  MESI.forEach((nome, i) => {
    const k = anno + '-' + String(i + 1).padStart(2, '0');
    const movs = delMese(k).slice().sort((a, b) => (a.data < b.data ? -1 : 1));
    const righe = [['USCITE', '', '', '', '', 'ENTRATE', '', '', ''], ['Data','Importo','Categoria','Descrizione','','Data','Importo','Categoria','Descrizione']];
    const us = movs.filter((m) => m.tipo === 'uscita'), en = movs.filter((m) => m.tipo === 'entrata');
    for (let r = 0; r < Math.max(us.length, en.length); r++) {
      const u = us[r], e = en[r];
      righe.push([
        u ? u.data : '', u ? u.importo : '', u ? u.categoria : '', u ? (u.descrizione || '') : '', '',
        e ? e.data : '', e ? e.importo : '', e ? e.categoria : '', e ? (e.descrizione || '') : ''
      ]);
    }
    fogli.push({ nome, righe });
  });
  const riep = [['Categoria', ...SIGLE.map((s) => s + ' ' + anno), 'Totale']];
  S.dati.categorie.uscite.forEach((c) => {
    const vals = MESI.map((_, i) => delMese(anno + '-' + String(i + 1).padStart(2, '0'))
      .filter((m) => m.tipo === 'uscita' && m.categoria === c.nome).reduce((s, m) => s + m.importo, 0));
    riep.push([c.nome, ...vals, vals.reduce((a, b) => a + b, 0)]);
  });
  fogli.push({ nome: 'Riepilogo', righe: riep });

  const sheets = fogli.map((f, i) => '<sheet name="' + xe(f.nome) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('');
  const rels = fogli.map((f, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('');
  const overrides = fogli.map((f, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('');

  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + overrides + '</Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets + '</sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>' }
  ];
  fogli.forEach((f, i) => files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: foglio(f.righe) }));
  scarica(zip(files), 'butterflies-' + anno + '.xlsx');
}

async function importaJson(file) {
  try {
    const d = normalizza(JSON.parse(await file.text()));
    if (!confirm('Sostituisco i dati attuali con ' + d.movimenti.length + ' movimenti dal file?')) return;
    snapshot();
    S.dati = d;
    scrivi(); render();
    toast('Importati ' + d.movimenti.length + ' movimenti.', annullaUltima);
  } catch (e) { toast('File non valido.'); }
}

/* ---------- viste ---------- */

function calcolaMese() {
  const movs = delMese(S.mese);
  const entrate = totale(movs, 'entrata', true), uscite = totale(movs, 'uscita', true);
  const catTot = {};
  movs.filter((m) => m.tipo === 'uscita').forEach((m) => { catTot[m.categoria] = (catTot[m.categoria] || 0) + m.importo; });
  const tot = Object.values(catTot).reduce((a, b) => a + b, 0);
  const ordinate = Object.keys(catTot).map((n) => ({ nome: n, val: catTot[n], colore: colore(n, 'uscita') })).sort((a, b) => b.val - a.val);
  return { movs, entrate, uscite, rimasto: entrate - uscite, catTot, tot, ordinate };
}
function donut(ordinate, tot) {
  if (!ordinate.length) return '#E4DCCD 0% 100%';
  let acc = 0;
  return ordinate.map((c) => {
    const a = (acc / tot) * 100; acc += c.val;
    return c.colore + ' ' + a.toFixed(2) + '% ' + ((acc / tot) * 100).toFixed(2) + '%';
  }).join(',');
}
function righeBudget(catTot) {
  const bm = S.dati.budget[S.mese] || {};
  return S.dati.categorie.uscite.map((c) => {
    const speso = catTot[c.nome] || 0, bud = bm[c.nome] || 0, diff = bud - speso;
    return {
      nome: c.nome, colore: c.colore, speso, bud, diff,
      w: Math.min(100, bud ? (speso / bud) * 100 : (speso ? 100 : 0)).toFixed(1) + '%',
      barColore: bud && speso > bud ? '#C0452B' : c.colore
    };
  }).sort((a, b) => b.speso - a.speso);
}

function vistaCasa() {
  const c = calcolaMese();
  const gTot = new Date(parseInt(S.mese.slice(0, 4), 10), parseInt(S.mese.slice(5), 10), 0).getDate();
  const gPass = S.mese === oggiISO().slice(0, 7) ? parseInt(oggiISO().slice(8), 10) : gTot;
  const media = c.uscite / Math.max(1, gPass);
  const budget = righeBudget(c.catTot).filter((b) => b.speso > 0).slice(0, 4);
  const recenti = c.movs.slice().sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 5);

  return '<div class="card" style="padding:22px">'
    + '<div style="display:flex;align-items:center;gap:20px">'
    + '<div style="width:140px;height:140px;border-radius:50%;flex:none;position:relative;background:conic-gradient(' + donut(c.ordinate, c.tot || 1) + ')">'
    + '<div style="position:absolute;inset:25px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center">'
    + '<div class="lbl" style="font-size:9.5px">Uscite</div>'
    + '<div class="num" style="font:400 24px/1.1 \'Instrument Serif\',serif;margin-top:3px">' + eur(c.uscite) + '</div>'
    + '</div></div>'
    + '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:9px">'
    + (c.ordinate.length ? c.ordinate.slice(0, 5).map((x) =>
        '<div style="display:flex;align-items:center;gap:8px;min-width:0">'
        + '<i style="width:9px;height:9px;border-radius:50%;flex:none;background:' + x.colore + '"></i>'
        + '<div class="ell" style="flex:1;min-width:0;font:600 12.5px/1.3 \'Manrope\'">' + esc(x.nome) + '</div>'
        + '<div class="num" style="flex:none;font:700 12.5px/1 \'Manrope\';color:#5C554B">' + Math.round((x.val / c.tot) * 100) + '%</div></div>').join('')
      : '<div style="font:500 13px/1.5 \'Manrope\';color:#6F675C">Nessuna uscita questo mese.</div>')
    + '</div></div>'
    + '<div style="display:flex;gap:10px;margin-top:20px;padding-top:18px;border-top:1px solid rgba(22,19,15,.08)">'
    + ['Rimasto|' + eur(c.rimasto) + '|#16130F', 'Entrate|' + eur(c.entrate) + '|#2E7356', 'Salvato|' + (c.entrate ? Math.round((c.rimasto / c.entrate) * 100) + '%' : '—') + '|#5B4BC4']
        .map((s) => { const [l, v, col] = s.split('|'); return '<div style="flex:1"><div class="lbl" style="font-size:10px;margin-bottom:6px">' + l + '</div><div class="num" style="font:700 17px/1 \'Manrope\';color:' + col + '">' + v + '</div></div>'; }).join('')
    + '</div></div>'

    + '<div style="display:flex;gap:10px;margin-top:10px">'
    + '<div class="card" style="flex:1;padding:13px 14px;border-radius:16px"><div class="lbl" style="margin-bottom:7px">Al giorno</div><div class="num" style="font:700 17px/1 \'Manrope\'">' + eur(media) + '</div></div>'
    + '<div class="card" style="flex:1;padding:13px 14px;border-radius:16px"><div class="lbl" style="margin-bottom:7px">Stima fine mese</div><div class="num" style="font:700 17px/1 \'Manrope\'">' + eur(media * gTot) + '</div></div>'
    + '</div>'

    + (budget.length ? '<div style="display:flex;align-items:center;justify-content:space-between;margin:26px 0 12px">'
        + '<div class="h2">Budget del mese</div><button data-go="stats" style="font:600 12.5px/1 \'Manrope\';color:#5B4BC4;padding:6px 0">Tutte</button></div>'
        + '<div style="display:flex;flex-direction:column;gap:12px">'
        + budget.map((b) =>
            '<div><div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">'
            + '<i style="width:8px;height:8px;border-radius:50%;flex:none;background:' + b.colore + '"></i>'
            + '<div class="ell" style="flex:1;min-width:0;font:600 13px/1.2 \'Manrope\'">' + esc(b.nome) + '</div>'
            + '<div class="num" style="flex:none;font:700 12.5px/1 \'Manrope\'">' + eur(b.speso) + '</div>'
            + '<div class="num" style="flex:none;font:500 11.5px/1 \'Manrope\';color:#7C7367">/ ' + (b.bud ? eur(b.bud) : '—') + '</div></div>'
            + '<div class="bar"><i style="width:' + b.w + ';background:' + b.barColore + '"></i></div></div>').join('')
        + '</div>' : '')

    + '<div style="display:flex;align-items:center;justify-content:space-between;margin:28px 0 10px">'
    + '<div class="h2">Ultimi movimenti</div><button data-go="storico" style="font:600 12.5px/1 \'Manrope\';color:#5B4BC4;padding:6px 0">Storico</button></div>'
    + (recenti.length
        ? '<div class="card" style="overflow:hidden">' + recenti.map((m) =>
            '<button class="row" data-det="' + m.id + '">'
            + '<div style="width:34px;height:34px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;font:800 12px/1 \'Manrope\';color:#fff;background:' + colore(m.categoria, m.tipo) + '">' + esc(sigla(m.categoria)) + '</div>'
            + '<div style="flex:1;min-width:0"><div class="ell" style="font:600 13.5px/1.25 \'Manrope\'">' + esc(m.descrizione || m.categoria) + '</div>'
            + '<div class="ell" style="font:500 11.5px/1.3 \'Manrope\';color:#7C7367;margin-top:2px">' + esc(m.categoria) + (m.categoria === 'Da rimborsare' && !m.rimborsato ? ' · in attesa' : '') + '</div></div>'
            + '<div style="text-align:right;flex:none"><div class="num" style="font:700 14px/1 \'Manrope\';color:' + (m.tipo === 'entrata' ? '#2E7356' : '#16130F') + '">' + (m.tipo === 'uscita' ? '−' : '+') + eur(m.importo) + '</div>'
            + '<div style="font:500 11px/1 \'Manrope\';color:#6F675C;margin-top:4px">' + m.data.slice(8) + ' ' + SIGLE[parseInt(m.data.slice(5, 7), 10) - 1].toLowerCase() + '</div></div></button>').join('') + '</div>'
        : '<div style="text-align:center;padding:40px 20px;color:#6F675C;font:500 13.5px/1.6 \'Manrope\'">Nessun movimento in ' + MESI[parseInt(S.mese.slice(5), 10) - 1].toLowerCase() + '.<br>Tocca + per la prima voce.</div>');
}

function vistaStorico() {
  const q = S.query.toLowerCase();
  let lista = S.query ? S.dati.movimenti.slice() : delMese(S.mese);
  if (S.filtro === 'Uscite') lista = lista.filter((m) => m.tipo === 'uscita');
  if (S.filtro === 'Entrate') lista = lista.filter((m) => m.tipo === 'entrata');
  if (S.filtro === 'Da rimborsare') lista = lista.filter((m) => m.categoria === 'Da rimborsare' && !m.rimborsato);
  if (S.filtro === 'Investimenti') lista = lista.filter((m) => m.categoria === 'Investimenti');
  if (q) lista = lista.filter((m) => (m.descrizione || '').toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q));
  lista.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  const gruppi = [];
  lista.forEach((m) => {
    let g = gruppi.find((x) => x.k === m.data);
    if (!g) { g = { k: m.data, righe: [], net: 0 }; gruppi.push(g); }
    g.righe.push(m);
    g.net += m.tipo === 'uscita' ? -m.importo : m.importo;
  });

  return '<div style="display:flex;align-items:center;gap:9px;background:#fff;border:1px solid rgba(22,19,15,.10);border-radius:13px;padding:11px 13px;margin-bottom:12px">'
    + '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6.8" cy="6.8" r="5" stroke="#6F675C" stroke-width="1.6"/><path d="M10.6 10.6L14.5 14.5" stroke="#6F675C" stroke-width="1.6" stroke-linecap="round"/></svg>'
    + '<input id="q" value="' + esc(S.query) + '" placeholder="Cerca in tutti i mesi" style="flex:1;border:0;outline:0;background:transparent;font:500 13.5px/1 \'Manrope\';min-width:0">'
    + '</div>'
    + '<div class="chips">' + ['Tutti','Uscite','Entrate','Da rimborsare','Investimenti']
        .map((f) => '<button class="chip" data-filtro="' + f + '" data-on="' + (S.filtro === f ? 1 : 0) + '">' + f + '</button>').join('') + '</div>'
    + (S.query ? '<div style="font:500 12px/1.4 \'Manrope\';color:#7C7367;margin:-6px 0 14px">' + lista.length + ' risultati in tutti i mesi</div>' : '')
    + (gruppi.length ? '<div style="display:flex;flex-direction:column;gap:18px">' + gruppi.map((g) =>
        '<div><div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 3px 8px">'
        + '<div style="font:700 12px/1 \'Manrope\';letter-spacing:.1em;text-transform:uppercase;color:#7C7367">' + esc(etichettaData(g.k)) + '</div>'
        + '<div class="num" style="font:700 12px/1 \'Manrope\';color:#5C554B">' + (g.net >= 0 ? '+' : '−') + eur(Math.abs(g.net)) + '</div></div>'
        + '<div class="card" style="overflow:hidden;border-radius:16px">' + g.righe.map((m) =>
            '<button class="row" data-det="' + m.id + '">'
            + '<i style="width:9px;height:9px;border-radius:50%;flex:none;background:' + colore(m.categoria, m.tipo) + '"></i>'
            + '<div style="flex:1;min-width:0"><div class="ell" style="font:600 13.5px/1.25 \'Manrope\'">' + esc(m.descrizione || m.categoria) + '</div>'
            + '<div class="ell" style="font:500 11.5px/1.3 \'Manrope\';color:#7C7367;margin-top:2px">' + esc(m.categoria) + (m.categoria === 'Da rimborsare' && !m.rimborsato ? ' · in attesa' : '') + '</div></div>'
            + '<div class="num" style="flex:none;font:700 14px/1 \'Manrope\';color:' + (m.tipo === 'entrata' ? '#2E7356' : '#16130F') + '">' + (m.tipo === 'uscita' ? '−' : '+') + eur(m.importo) + '</div></button>').join('')
        + '</div></div>').join('') + '</div>'
      : '<div style="text-align:center;padding:60px 20px;color:#6F675C;font:500 13.5px/1.6 \'Manrope\'">Nessun movimento con questi filtri.</div>');
}

function vistaStats() {
  const anno = S.mese.slice(0, 4);
  const perAnno = S.vista === 'anno';
  const movs = perAnno ? S.dati.movimenti.filter((m) => m.data.slice(0, 4) === anno) : delMese(S.mese);
  const entrate = totale(movs, 'entrata', true), uscite = totale(movs, 'uscita', true);
  const catTot = {};
  movs.filter((m) => m.tipo === 'uscita').forEach((m) => { catTot[m.categoria] = (catTot[m.categoria] || 0) + m.importo; });
  const tot = Object.values(catTot).reduce((a, b) => a + b, 0) || 1;
  const ordinate = Object.keys(catTot).map((n) => ({ nome: n, val: catTot[n], colore: colore(n, 'uscita') })).sort((a, b) => b.val - a.val);
  const daRimb = movs.filter((m) => m.categoria === 'Da rimborsare' && m.tipo === 'uscita' && !m.rimborsato).reduce((s, m) => s + m.importo, 0);

  const mesi = MESI.map((_, i) => {
    const k = anno + '-' + String(i + 1).padStart(2, '0');
    const mm = delMese(k);
    return { i, k, sigla: SIGLE[i], inn: totale(mm, 'entrata', true), out: totale(mm, 'uscita', true) };
  });
  const max = Math.max(1, ...mesi.map((m) => Math.max(m.inn, m.out)));

  const tutte = righeBudget(catTot);
  const rischio = tutte.filter((b) => b.bud && b.speso >= b.bud * 0.8);
  const mostra = S.tutteCategorie ? tutte : (rischio.length ? rischio : tutte.slice(0, 5));

  return '<div class="seg" style="margin-bottom:18px">'
    + '<button data-vista="mese" data-on="' + (S.vista === 'mese' ? 1 : 0) + '">Mese</button>'
    + '<button data-vista="anno" data-on="' + (S.vista === 'anno' ? 1 : 0) + '">Anno ' + anno + '</button></div>'

    + '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:22px">'
    + '<div style="display:flex;gap:10px">'
    + '<div style="flex:1;background:#16130F;color:#F7F3EC;border-radius:16px;padding:14px 15px"><div class="lbl" style="color:rgba(247,243,236,.6);font-size:10px;margin-bottom:8px">Entrate − Uscite</div><div class="num" style="font:700 19px/1 \'Manrope\'">' + (entrate - uscite >= 0 ? '+' : '−') + eur(Math.abs(entrate - uscite)) + '</div></div>'
    + '<div class="card" style="flex:1;border-radius:16px;padding:14px 15px"><div class="lbl" style="font-size:10px;margin-bottom:8px">% salvata</div><div class="num" style="font:700 19px/1 \'Manrope\';color:#5B4BC4">' + (entrate ? Math.round(((entrate - uscite) / entrate) * 100) + '%' : '—') + '</div></div></div>'
    + '<div style="display:flex;gap:10px">'
    + '<div class="card" style="flex:1;border-radius:16px;padding:14px 15px"><div class="lbl" style="font-size:10px;margin-bottom:8px">Uscite / Entrate</div><div class="num" style="font:700 19px/1 \'Manrope\'">' + (entrate ? Math.round((uscite / entrate) * 100) + '%' : '—') + '</div></div>'
    + '<div class="card" style="flex:1;border-radius:16px;padding:14px 15px"><div class="lbl" style="font-size:10px;margin-bottom:8px">Da rimborsare</div><div class="num" style="font:700 19px/1 \'Manrope\';color:#A8863C">' + eur(daRimb) + '</div></div></div></div>'

    + '<div class="h2" style="margin-bottom:12px">Dove sono finiti i soldi</div>'
    + '<div class="card" style="border-radius:20px;padding:22px;display:flex;flex-direction:column;align-items:center;gap:20px">'
    + '<div style="width:190px;height:190px;border-radius:50%;position:relative;background:conic-gradient(' + donut(ordinate, tot) + ')">'
    + '<div style="position:absolute;inset:32px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center">'
    + '<div class="lbl" style="font-size:10px">Speso</div><div class="num" style="font:400 28px/1.1 \'Instrument Serif\',serif;margin-top:4px">' + eur(uscite) + '</div></div></div>'
    + '<div style="width:100%;display:flex;flex-direction:column;gap:10px">'
    + (ordinate.length ? ordinate.map((c) =>
        '<div style="display:flex;align-items:center;gap:9px">'
        + '<i style="width:10px;height:10px;border-radius:3px;flex:none;background:' + c.colore + '"></i>'
        + '<div class="ell" style="flex:1;min-width:0;font:600 12.5px/1.3 \'Manrope\'">' + esc(c.nome) + '</div>'
        + '<div class="num" style="flex:none;font:700 12.5px/1 \'Manrope\'">' + eur(c.val) + '</div>'
        + '<div class="num" style="flex:none;width:42px;text-align:right;font:600 11.5px/1 \'Manrope\';color:#7C7367">' + Math.round((c.val / tot) * 100) + '%</div></div>').join('')
      : '<div style="font:500 13px/1.5 \'Manrope\';color:#6F675C">Ancora nessuna uscita.</div>')
    + '</div></div>'

    + '<div class="h2" style="margin:26px 0 10px">Entrate e uscite, mese per mese</div>'
    + '<div class="card" style="padding:16px 14px 12px">'
    + '<div style="display:flex;align-items:flex-end;gap:5px">'
    + mesi.map((m) => '<button data-mese="' + m.k + '" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px">'
        + '<div style="width:100%;height:92px;display:flex;align-items:flex-end;gap:2px">'
        + '<i style="flex:1;border-radius:3px 3px 0 0;background:#8FBBA6;height:' + ((m.inn / max) * 100).toFixed(1) + '%"></i>'
        + '<i style="flex:1;border-radius:3px 3px 0 0;background:#E0553A;height:' + ((m.out / max) * 100).toFixed(1) + '%"></i></div>'
        + '<div style="font:700 9.5px/1 \'Manrope\';color:' + (m.k === S.mese ? '#16130F' : '#B3AA9C') + '">' + m.sigla + '</div></button>').join('')
    + '</div>'
    + '<div style="display:flex;gap:16px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(22,19,15,.08)">'
    + '<div style="display:flex;align-items:center;gap:6px;font:600 11px/1 \'Manrope\';color:#5C554B"><i style="width:9px;height:9px;border-radius:2px;background:#8FBBA6"></i>Entrate</div>'
    + '<div style="display:flex;align-items:center;gap:6px;font:600 11px/1 \'Manrope\';color:#5C554B"><i style="width:9px;height:9px;border-radius:2px;background:#E0553A"></i>Uscite</div>'
    + '<div style="margin-left:auto;font:600 11px/1 \'Manrope\';color:#7C7367">solo portafoglio</div></div></div>'

    + '<div class="h2" style="margin:26px 0 10px">Speso vs previsto</div>'
    + (S.tutteCategorie || !rischio.length ? '' : '<div style="font:500 12px/1.5 \'Manrope\';color:#7C7367;margin:-4px 0 12px">Solo le categorie oltre l\'80% del budget.</div>')
    + '<div style="display:flex;flex-direction:column;gap:14px">'
    + mostra.map((b) =>
        '<div><div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">'
        + '<div class="ell" style="flex:1;min-width:0;font:600 13px/1.2 \'Manrope\'">' + esc(b.nome) + '</div>'
        + '<div class="num" style="flex:none;font:700 12.5px/1 \'Manrope\'">' + eur(b.speso) + '</div>'
        + '<div class="num" style="flex:none;font:600 11.5px/1 \'Manrope\';color:' + (!b.bud ? '#6F675C' : b.diff >= 0 ? '#2E7356' : '#C0452B') + '">'
        + (b.bud ? (b.diff >= 0 ? 'resta ' + eur(b.diff) : '+' + eur(-b.diff)) : '—') + '</div></div>'
        + '<div class="bar" style="height:8px"><i style="width:' + b.w + ';background:' + b.barColore + '"></i></div></div>').join('')
    + '</div>'
    + '<button id="toggleTutte" style="width:100%;margin-top:14px;padding:13px 0;border-radius:12px;border:1px solid rgba(22,19,15,.12);font:700 12.5px/1 \'Manrope\';color:#5C554B">'
    + (S.tutteCategorie ? 'Mostra solo quelle a rischio' : 'Mostra tutte le ' + tutte.length + ' categorie') + '</button>';
}

function vistaImpostazioni() {
  const collegato = !!S.dirHandle;
  const tutte = righeBudget(calcolaMese().catTot);

  return '<div class="sect" style="margin:2px 0 10px">Il tuo file</div>'
    + '<div class="card" style="padding:16px 17px">'
    + '<div style="display:flex;align-items:center;gap:10px">'
    + '<div style="width:38px;height:38px;border-radius:11px;background:#EFE9DE;display:flex;align-items:center;justify-content:center;flex:none"><svg width="17" height="20" viewBox="0 0 18 22" fill="none"><path d="M2 1.8h9l5 5v13.4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1Z" stroke="#5B4BC4" stroke-width="1.6"/><path d="M11 1.8V7h5" stroke="#5B4BC4" stroke-width="1.6"/></svg></div>'
    + '<div style="flex:1;min-width:0"><div style="font:700 13.5px/1.2 \'Manrope\'">' + FILENAME + '</div>'
    + '<div class="ell" style="font:500 11.5px/1.3 \'Manrope\';color:#7C7367;margin-top:3px">' + (collegato ? 'in ' + esc(S.dirHandle.name) + ' · salvato ' + esc(S.salvato) : 'nessuna cartella collegata') + '</div></div></div>'

    + (collegato
        ? '<div style="display:flex;align-items:center;gap:8px;margin:14px 0 12px;padding:11px 12px;border-radius:11px;background:#F2F7F4"><i style="width:7px;height:7px;border-radius:50%;background:#2E7356;flex:none"></i><div style="font:600 12px/1.4 \'Manrope\';color:#2E7356;text-wrap:pretty">Salvataggio automatico attivo — ogni modifica riscrive il file.</div></div>'
        : (supportaFS
            ? '<div style="margin:14px 0 12px;padding:12px;border-radius:11px;background:#FBF4E8;font:500 12px/1.5 \'Manrope\';color:#7A5E20;text-wrap:pretty">I dati sono solo in questo browser. Collega una cartella (meglio se sincronizzata con Drive) per avere il file vero e il backup.</div>'
            : '<div style="margin:14px 0 12px;padding:12px;border-radius:11px;background:#FBF4E8;font:500 12px/1.5 \'Manrope\';color:#7A5E20;text-wrap:pretty">Questo browser non può scrivere direttamente su file. Usa Chrome su Android, oppure esporta a mano con i pulsanti qui sotto.</div>'))

    + (supportaFS ? '<button id="pickDir" class="cta" style="background:#16130F;color:#F7F3EC">' + (collegato ? 'Cambia cartella' : 'Scegli la cartella') + '</button>' : '')
    + '<div style="display:flex;gap:8px;margin-top:8px">'
    + '<button id="expJson" style="flex:1;padding:13px 0;border-radius:11px;background:#EFE9DE;font:700 12.5px/1 \'Manrope\';min-height:44px">.json</button>'
    + '<button id="expCsv" style="flex:1;padding:13px 0;border-radius:11px;background:#EFE9DE;font:700 12.5px/1 \'Manrope\';min-height:44px">.csv</button>'
    + '<button id="expXlsx" style="flex:1;padding:13px 0;border-radius:11px;background:#EFE9DE;font:700 12.5px/1 \'Manrope\';min-height:44px">.xlsx</button>'
    + '</div>'
    + '<label style="display:block;margin-top:8px;text-align:center;padding:13px 0;border-radius:11px;border:1px dashed rgba(22,19,15,.22);color:#5C554B;font:700 12.5px/1 \'Manrope\';cursor:pointer">Importa un .json<input id="imp" type="file" accept="application/json,.json" style="display:none"></label>'
    + '</div>'

    + '<div class="sect" style="margin:26px 0 10px">Totale portafoglio</div>'
    + '<div class="card" style="overflow:hidden">'
    + '<div style="padding:13px 16px;font:500 12.5px/1.5 \'Manrope\';color:#5C554B;border-bottom:1px solid rgba(22,19,15,.06)">Categorie escluse dal calcolo, come nel foglio Excel.</div>'
    + ['Buoni pasto','Da rimborsare','Investimenti'].map((n) => {
        const on = escluse('uscita').indexOf(n) >= 0;
        return '<button class="row" data-escl="' + esc(n) + '"><div style="flex:1;font:600 13.5px/1.2 \'Manrope\'">' + n + '</div>'
          + '<div style="width:44px;height:26px;border-radius:99px;position:relative;flex:none;background:' + (on ? '#5B4BC4' : 'rgba(22,19,15,.16)') + '">'
          + '<i style="position:absolute;top:3px;left:' + (on ? '21px' : '3px') + ';width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);display:block"></i></div></button>';
      }).join('')
    + '</div>'

    + '<div class="sect" style="margin:26px 0 10px">Budget · ' + MESI[parseInt(S.mese.slice(5), 10) - 1] + ' ' + S.mese.slice(0, 4) + '</div>'
    + '<div class="card" style="overflow:hidden">'
    + tutte.map((b) =>
        '<div class="row"><i style="width:9px;height:9px;border-radius:50%;flex:none;background:' + b.colore + '"></i>'
        + '<div class="ell" style="flex:1;min-width:0;font:600 13px/1.2 \'Manrope\'">' + esc(b.nome) + '</div>'
        + '<div style="display:flex;align-items:center;gap:4px;background:#F7F3EC;border-radius:9px;padding:7px 10px;flex:none">'
        + '<span style="font:600 12px/1 \'Manrope\';color:#6F675C">€</span>'
        + '<input class="bud" data-cat="' + esc(b.nome) + '" value="' + b.bud + '" inputmode="decimal" style="width:58px;border:0;outline:0;background:transparent;font:700 13px/1 \'Manrope\';text-align:right;font-variant-numeric:tabular-nums"></div></div>').join('')
    + '</div>'
    + '<div style="text-align:center;padding:24px 0 8px;font:500 11.5px/1.6 \'Manrope\';color:#6F675C">Butterflies in the wallet<br>' + S.dati.movimenti.length + ' movimenti salvati</div>';
}

/* ---------- sheet: aggiungi / dettaglio ---------- */

function apriAggiungi() {
  S.bozza = { tipo: 'uscita', data: oggiISO(), importo: '', categoria: '', descrizione: '' };
  renderSheets();
}
function sheetAggiungi() {
  const b = S.bozza;
  const cats = b.tipo === 'entrata' ? S.dati.categorie.entrate : S.dati.categorie.uscite;
  const pronto = b.categoria && parseFloat(String(b.importo).replace(',', '.')) > 0;
  return '<div class="sheet" id="sheetAdd"><div class="scrim" data-close="1"></div><div class="panel">'
    + '<div class="grab"></div>'
    + '<div class="seg" style="margin-bottom:18px">'
    + '<button data-tipo="uscita" data-on="' + (b.tipo === 'uscita' ? 1 : 0) + '" style="' + (b.tipo === 'uscita' ? 'color:#C0452B' : '') + '">Uscita</button>'
    + '<button data-tipo="entrata" data-on="' + (b.tipo === 'entrata' ? 1 : 0) + '" style="' + (b.tipo === 'entrata' ? 'color:#2E7356' : '') + '">Entrata</button></div>'
    + '<div style="display:flex;flex-direction:column;gap:11px">'
    + '<div><div class="lbl" style="margin-bottom:7px">Data</div><input class="field" id="f-data" type="date" value="' + b.data + '"></div>'
    + '<div><div class="lbl" style="margin-bottom:7px">Importo</div><input class="field" id="f-imp" inputmode="decimal" placeholder="0,00" value="' + esc(b.importo) + '" style="font:700 20px/1.1 \'Manrope\';font-variant-numeric:tabular-nums"></div>'
    + '<div><div class="lbl" style="margin-bottom:7px">Categoria</div><select class="field" id="f-cat"><option value="">Scegli…</option>'
    + cats.map((c) => '<option value="' + esc(c.nome) + '"' + (b.categoria === c.nome ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select></div>'
    + '<div><div class="lbl" style="margin-bottom:7px">Descrizione</div><input class="field" id="f-desc" placeholder="Es. Esselunga" value="' + esc(b.descrizione) + '" style="font-weight:500"></div>'
    + '</div>'
    + '<button id="salvaMov" class="cta" style="margin-top:16px"' + (pronto ? '' : ' disabled') + '>' + (b.categoria ? 'Salva ' + b.tipo : 'Scegli una categoria') + '</button>'
    + '</div></div>';
}
function sheetDettaglio() {
  const m = S.dettaglio;
  return '<div class="sheet" id="sheetDet"><div class="scrim" data-close="1"></div>'
    + '<div class="panel" style="border-radius:24px;margin:0 16px calc(16px + env(safe-area-inset-bottom));padding:22px">'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">'
    + '<div style="width:44px;height:44px;border-radius:13px;flex:none;display:flex;align-items:center;justify-content:center;font:800 13px/1 \'Manrope\';color:#fff;background:' + colore(m.categoria, m.tipo) + '">' + esc(sigla(m.categoria)) + '</div>'
    + '<div style="flex:1;min-width:0"><div class="ell" style="font:700 15px/1.2 \'Manrope\'">' + esc(m.descrizione || m.categoria) + '</div>'
    + '<div class="ell" style="font:500 12px/1.3 \'Manrope\';color:#7C7367;margin-top:3px">' + esc(m.categoria) + ' · ' + esc(etichettaData(m.data)) + (m.rimborsato ? ' · rimborsato' : '') + '</div></div>'
    + '<div class="num" style="font:700 18px/1 \'Manrope\';color:' + (m.tipo === 'entrata' ? '#2E7356' : '#C0452B') + '">' + (m.tipo === 'uscita' ? '−' : '+') + eur(m.importo) + '</div></div>'
    + (m.categoria === 'Da rimborsare' ? '<button id="detRimb" class="cta" style="background:#A8863C;color:#fff;margin-bottom:8px">' + (m.rimborsato ? 'Segna come non rimborsato' : 'Segna come rimborsato') + '</button>' : '')
    + '<div style="display:flex;gap:8px">'
    + '<button id="detDup" style="flex:1;padding:14px 0;border-radius:13px;background:#EFE9DE;font:700 13px/1 \'Manrope\';min-height:46px">Duplica</button>'
    + '<button id="detDel" style="flex:1;padding:14px 0;border-radius:13px;background:rgba(192,69,43,.1);color:#C0452B;font:700 13px/1 \'Manrope\';min-height:46px">Elimina</button></div>'
    + '<button data-close="1" style="width:100%;margin-top:8px;padding:13px 0;font:700 13px/1 \'Manrope\';color:#7C7367">Chiudi</button>'
    + '</div></div>';
}

/* ---------- render ---------- */

function pennello() {
  const el = document.getElementById('statoSalva');
  if (!el) return;
  const testo = S.scrivo ? 'salvo…' : (S.salvato === 'adesso' ? 'salvato adesso' : S.salvato === 'dal file' ? 'salvato' : S.salvato);
  const col = S.salvato.startsWith('errore') ? '#C0452B' : S.dirHandle ? '#4E9C74' : '#C99A2E';
  el.querySelector('i').style.background = col;
  el.querySelector('span').textContent = testo;
}

function render() {
  document.getElementById('meseLabel').textContent = MESI[parseInt(S.mese.slice(5), 10) - 1] + ' ' + S.mese.slice(0, 4);
  document.querySelectorAll('.tab').forEach((t) => { t.style.color = t.dataset.tab === S.tab ? '#16130F' : '#A39A8C'; });
  const main = document.getElementById('scroll');
  const y = main.scrollTop;
  main.innerHTML = S.tab === 'casa' ? vistaCasa()
    : S.tab === 'storico' ? vistaStorico()
    : S.tab === 'stats' ? vistaStats()
    : vistaImpostazioni();
  if (S.tab === S.ultimoTab) main.scrollTop = y; else main.scrollTop = 0;
  S.ultimoTab = S.tab;
  pennello();
  renderSheets();
}
function renderSheets() {
  const host = document.getElementById('sheets');
  host.innerHTML = (S.bozza ? sheetAggiungi() : '') + (S.dettaglio ? sheetDettaglio() : '');
}

/* ---------- eventi ---------- */

document.getElementById('mesePrev').onclick = () => spostaMese(-1);
document.getElementById('meseNext').onclick = () => spostaMese(1);
document.getElementById('fab').onclick = apriAggiungi;
document.getElementById('statoSalva').onclick = () => { S.tab = 'impostazioni'; render(); };
document.querySelectorAll('.tab').forEach((t) => { t.onclick = () => { S.tab = t.dataset.tab; render(); }; });

document.getElementById('scroll').addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) { S.tab = go.dataset.go; render(); return; }
  const det = e.target.closest('[data-det]');
  if (det) { S.dettaglio = S.dati.movimenti.find((m) => m.id === det.dataset.det) || null; renderSheets(); return; }
  const f = e.target.closest('[data-filtro]');
  if (f) { S.filtro = f.dataset.filtro; render(); return; }
  const v = e.target.closest('[data-vista]');
  if (v) { S.vista = v.dataset.vista; render(); return; }
  const mm = e.target.closest('[data-mese]');
  if (mm) { S.mese = mm.dataset.mese; S.vista = 'mese'; render(); return; }
  const ex = e.target.closest('[data-escl]');
  if (ex) { toggleEsclusione(ex.dataset.escl); return; }
  if (e.target.closest('#toggleTutte')) { S.tutteCategorie = !S.tutteCategorie; render(); return; }
  if (e.target.closest('#pickDir')) { scegliCartella(); return; }
  if (e.target.closest('#expJson')) { exportJson(); return; }
  if (e.target.closest('#expCsv')) { exportCsv(); return; }
  if (e.target.closest('#expXlsx')) { exportXlsx(); return; }
});

document.getElementById('scroll').addEventListener('input', (e) => {
  if (e.target.id === 'q') {
    S.query = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const nuovo = document.getElementById('q');
    if (nuovo) { nuovo.focus(); nuovo.setSelectionRange(pos, pos); }
  }
});
document.getElementById('scroll').addEventListener('change', (e) => {
  if (e.target.classList.contains('bud')) setBudget(e.target.dataset.cat, e.target.value);
  if (e.target.id === 'imp' && e.target.files[0]) importaJson(e.target.files[0]);
});

document.getElementById('sheets').addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) { S.bozza = null; S.dettaglio = null; renderSheets(); return; }
  const t = e.target.closest('[data-tipo]');
  if (t) { S.bozza.tipo = t.dataset.tipo; S.bozza.categoria = ''; renderSheets(); return; }
  if (e.target.closest('#salvaMov')) {
    const b = S.bozza, imp = parseFloat(String(b.importo).replace(',', '.'));
    if (!b.categoria || !(imp > 0)) return;
    S.bozza = null;
    aggiungi({
      id: 'm' + Date.now(), tipo: b.tipo, data: b.data || oggiISO(),
      importo: Math.round(imp * 100) / 100, categoria: b.categoria,
      descrizione: b.descrizione || b.categoria,
      ...(b.categoria === 'Da rimborsare' ? { rimborsato: false } : {})
    });
    return;
  }
  if (e.target.closest('#detRimb')) { toggleRimborso(S.dettaglio.id); return; }
  if (e.target.closest('#detDup')) { duplica(S.dettaglio); return; }
  if (e.target.closest('#detDel')) { elimina(S.dettaglio.id); return; }
});
document.getElementById('sheets').addEventListener('input', (e) => {
  if (!S.bozza) return;
  if (e.target.id === 'f-data') S.bozza.data = e.target.value;
  if (e.target.id === 'f-imp') S.bozza.importo = e.target.value;
  if (e.target.id === 'f-desc') S.bozza.descrizione = e.target.value;
  if (e.target.id === 'f-imp' || e.target.id === 'f-cat') aggiornaCta();
});
document.getElementById('sheets').addEventListener('change', (e) => {
  if (S.bozza && e.target.id === 'f-cat') { S.bozza.categoria = e.target.value; aggiornaCta(); }
});
function aggiornaCta() {
  const btn = document.getElementById('salvaMov');
  if (!btn || !S.bozza) return;
  const pronto = S.bozza.categoria && parseFloat(String(S.bozza.importo).replace(',', '.')) > 0;
  btn.disabled = !pronto;
  btn.textContent = S.bozza.categoria ? 'Salva ' + S.bozza.tipo : 'Scegli una categoria';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (S.bozza || S.dettaglio)) { S.bozza = null; S.dettaglio = null; renderSheets(); }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

avvia();
