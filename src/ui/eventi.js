/* Collegamento degli eventi: header, tab bar, contenuto (delegato) e sheet. */

import { S } from '../state.js';
import { oggiISO } from '../core/formato.js';
import { bozzaPronta, movimentoDaBozza } from '../core/dati.js';
import { aggiungi, elimina, duplica, toggleRimborso, setBudget, toggleEsclusione, spostaMese, importaJson } from '../azioni.js';
import { scegliCartella } from '../persistenza.js';
import { exportJson, exportCsv, exportXlsx } from '../export/index.js';
import { render, renderSheets } from './render.js';
import { aggiornaCta } from './sheet/aggiungi.js';

function vaiA(tab) { S.tab = tab; render(); }

function chiudiSheet() { S.bozza = null; S.dettaglio = null; renderSheets(); }

function apriAggiungi() {
  S.bozza = { tipo: 'uscita', data: oggiISO(), importo: '', categoria: '', descrizione: '' };
  renderSheets();
}

/* click nel contenuto: il primo selettore che corrisponde vince */
const CLICK_CONTENUTO = [
  ['[data-go]', (el) => vaiA(el.dataset.go)],
  ['[data-det]', (el) => { S.dettaglio = S.dati.movimenti.find((m) => m.id === el.dataset.det) || null; renderSheets(); }],
  ['[data-filtro]', (el) => { S.filtro = el.dataset.filtro; render(); }],
  ['[data-vista]', (el) => { S.vista = el.dataset.vista; render(); }],
  ['[data-mese]', (el) => { S.mese = el.dataset.mese; S.vista = 'mese'; render(); }],
  ['[data-escl]', (el) => toggleEsclusione(el.dataset.escl)],
  ['#toggleTutte', () => { S.tutteCategorie = !S.tutteCategorie; render(); }],
  ['#pickDir', scegliCartella],
  ['#expJson', exportJson],
  ['#expCsv', exportCsv],
  ['#expXlsx', exportXlsx]
];

const CLICK_SHEET = [
  ['[data-close]', chiudiSheet],
  ['[data-tipo]', (el) => { S.bozza.tipo = el.dataset.tipo; S.bozza.categoria = ''; renderSheets(); }],
  ['#salvaMov', () => {
    const b = S.bozza;
    if (!bozzaPronta(b)) return;
    S.bozza = null;
    aggiungi(movimentoDaBozza(b));
  }],
  ['#detRimb', () => toggleRimborso(S.dettaglio.id)],
  ['#detDup', () => duplica(S.dettaglio)],
  ['#detDel', () => elimina(S.dettaglio.id)]
];

function delega(gestori) {
  return (e) => {
    for (const [sel, fn] of gestori) {
      const el = e.target.closest(sel);
      if (el) { fn(el); return; }
    }
  };
}

export function collegaEventi() {
  document.getElementById('mesePrev').onclick = () => spostaMese(-1);
  document.getElementById('meseNext').onclick = () => spostaMese(1);
  document.getElementById('fab').onclick = apriAggiungi;
  document.getElementById('statoSalva').onclick = () => vaiA('impostazioni');
  document.querySelectorAll('.tab').forEach((t) => { t.onclick = () => vaiA(t.dataset.tab); });

  const main = document.getElementById('scroll');
  main.addEventListener('click', delega(CLICK_CONTENUTO));
  main.addEventListener('input', (e) => {
    if (e.target.id !== 'q') return;
    // la ricerca ridisegna la vista: rimetti il cursore dov'era
    S.query = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const nuovo = document.getElementById('q');
    if (nuovo) { nuovo.focus(); nuovo.setSelectionRange(pos, pos); }
  });
  main.addEventListener('change', (e) => {
    if (e.target.classList.contains('bud')) setBudget(e.target.dataset.cat, e.target.value);
    if (e.target.id === 'imp' && e.target.files[0]) importaJson(e.target.files[0]);
  });

  const sheets = document.getElementById('sheets');
  sheets.addEventListener('click', delega(CLICK_SHEET));
  sheets.addEventListener('input', (e) => {
    if (!S.bozza) return;
    if (e.target.id === 'f-data') S.bozza.data = e.target.value;
    if (e.target.id === 'f-imp') S.bozza.importo = e.target.value;
    if (e.target.id === 'f-desc') S.bozza.descrizione = e.target.value;
    if (e.target.id === 'f-imp' || e.target.id === 'f-cat') aggiornaCta();
  });
  sheets.addEventListener('change', (e) => {
    if (S.bozza && e.target.id === 'f-cat') { S.bozza.categoria = e.target.value; aggiornaCta(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (S.bozza || S.dettaglio)) chiudiSheet();
  });
}
