/* Collegamento degli eventi: header, tab bar, contenuto (delegato) e sheet. */

import { S } from '../state.js';
import { LS_BANNER } from '../core/costanti.js';
import { oggiISO, ieriISO } from '../core/formato.js';
import { PALETTE } from '../core/costanti.js';
import { bozzaPronta, movimentoDaBozza, bozzaDaMovimento, usoCategoria } from '../core/dati.js';
import { categorie, colore } from '../core/calcoli.js';
import {
  aggiungi, modifica, elimina, duplica, toggleRimborso, setBudget, copiaBudget, toggleEsclusione,
  spostaMese, meseCorrente, importaJson, salvaCategoria, rimuoviCategoria
} from '../azioni.js';
import { scegliCartella, riattivaAccesso, confermaVersione } from '../persistenza.js';
import { exportJson, exportCsv, exportXlsx } from '../export/index.js';
import { render, renderSheets, apriSheet, chiudiSheet } from './render.js';
import { aggiornaForm, animaSalvataggio } from './sheet/aggiungi.js';
import { aggiornaCategoria } from './sheet/categoria.js';

function vaiA(tab) { S.tab = tab; render(); }

/* il form si apre con il cursore nell'importo, così la tastiera numerica è già pronta */
function focusImporto() {
  const f = document.getElementById('f-imp');
  if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
}

function apriAggiungi() {
  S.bozza = { tipo: 'uscita', data: oggiISO(), importo: '', categoria: '', descrizione: '' };
  apriSheet();
  focusImporto();
}

function apriModifica() {
  S.bozza = bozzaDaMovimento(S.dettaglio);
  S.dettaglio = null;
  renderSheets();
  focusImporto();
}

function salvaBozza() {
  const b = S.bozza;
  if (!bozzaPronta(b)) return;
  // un'uscita "esce dal portafoglio": animazione, e il messaggio arriva quando è finita
  const ritardo = b.tipo === 'uscita' ? animaSalvataggio() : 0;
  chiudiSheet();
  if (b.id) modifica(b, ritardo); else aggiungi(movimentoDaBozza(S.dati, b), ritardo);
}

function scegliGiorno(giorno) {
  if (giorno === 'altra') {
    const inp = document.getElementById('f-data');
    try { inp.showPicker(); } catch (e) { inp.classList.add('is-visibile'); inp.focus(); }
    return;
  }
  S.bozza.data = giorno === 'ieri' ? ieriISO() : oggiISO();
  aggiornaForm();
}

/* nome = null: categoria nuova, con il primo colore della tavolozza non ancora usato in quel tipo */
function apriCategoria(tipo, nome) {
  const usati = categorie(S.dati, tipo).map((c) => c.colore);
  S.categoria = {
    tipo, originale: nome, nome: nome || '', eliminando: false, destinazione: '',
    colore: nome ? colore(S.dati, nome, tipo) : PALETTE.find((c) => usati.indexOf(c) < 0) || PALETTE[0]
  };
  apriSheet();
}

/* senza movimenti né budget si elimina subito (si può annullare dal toast), altrimenti si sceglie dove spostarli */
function eliminaCategoria() {
  const c = S.categoria, u = usoCategoria(S.dati, c.tipo, c.originale);
  if (u.movimenti || u.budget) { c.eliminando = true; renderSheets(); return; }
  chiudiSheet();
  rimuoviCategoria(c.tipo, c.originale);
}

function confermaElimina() {
  const c = S.categoria;
  chiudiSheet();
  rimuoviCategoria(c.tipo, c.originale, c.destinazione);
}

function nascondiBanner() {
  S.bannerNascosto = true;
  try { localStorage.setItem(LS_BANNER, '1'); } catch (e) {}
  render();
}

/* click nel contenuto: il primo selettore che corrisponde vince */
const CLICK_CONTENUTO = [
  ['[data-go]', (el) => vaiA(el.dataset.go)],
  ['[data-det]', (el) => { S.dettaglio = S.dati.movimenti.find((m) => m.id === el.dataset.det) || null; apriSheet(); }],
  ['[data-filtro]', (el) => { S.filtro = el.dataset.filtro; render(); }],
  ['[data-vista]', (el) => { S.vista = el.dataset.vista; render(); }],
  ['[data-mese]', (el) => { S.mese = el.dataset.mese; S.vista = 'mese'; render(); }],
  ['[data-escl]', (el) => toggleEsclusione(el.dataset.escl)],
  ['[data-bud-copia]', (el) => copiaBudget(el.dataset.budCopia)],
  ['[data-cat-nuova]', (el) => apriCategoria(el.dataset.catNuova, null)],
  ['[data-cat-mod]', (el) => apriCategoria(el.dataset.catMod, el.dataset.nome)],
  ['#toggleTutte', () => { S.tutteCategorie = !S.tutteCategorie; render(); }],
  ['#pickDir', scegliCartella],
  ['#riattiva', riattivaAccesso],
  ['#bannerNo', nascondiBanner],
  ['#expJson', exportJson],
  ['#expCsv', exportCsv],
  ['#expXlsx', exportXlsx]
];

const CLICK_SHEET = [
  ['[data-close]', chiudiSheet],
  ['[data-tipo]', (el) => { S.bozza.tipo = el.dataset.tipo; S.bozza.categoria = ''; renderSheets(); }],
  ['[data-giorno]', (el) => scegliGiorno(el.dataset.giorno)],
  ['#salvaMov', salvaBozza],
  ['#detRimb', () => toggleRimborso(S.dettaglio.id)],
  ['#detMod', apriModifica],
  ['#detDup', () => { const m = S.dettaglio; chiudiSheet(); duplica(m); }],
  ['#detDel', () => { const id = S.dettaglio.id; chiudiSheet(); elimina(id); }],
  ['#confOk', confermaVersione],
  ['[data-colore]', (el) => { S.categoria.colore = el.dataset.colore; renderSheets(); }],
  ['#salvaCat', () => { const c = S.categoria; chiudiSheet(); salvaCategoria(c); }],
  ['#eliminaCat', eliminaCategoria],
  ['#annullaElimina', () => { S.categoria.eliminando = false; S.categoria.destinazione = ''; renderSheets(); }],
  ['#confElimina', confermaElimina]
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
  document.getElementById('meseLabel').onclick = meseCorrente;
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
    if (S.categoria && e.target.id === 'c-nome') { S.categoria.nome = e.target.value; aggiornaCategoria(); }
    if (!S.bozza) return;
    if (e.target.id === 'f-data' && e.target.value) S.bozza.data = e.target.value;
    if (e.target.id === 'f-imp') S.bozza.importo = e.target.value;
    if (e.target.id === 'f-desc') S.bozza.descrizione = e.target.value;
    if (e.target.id === 'f-imp' || e.target.id === 'f-data') aggiornaForm();
  });
  sheets.addEventListener('change', (e) => {
    if (S.bozza && e.target.id === 'f-cat') { S.bozza.categoria = e.target.value; aggiornaForm(); }
    if (S.conflitto && e.target.name === 'versione') { S.conflitto.scelta = e.target.value; renderSheets(); }
    if (S.categoria && e.target.id === 'c-dest') { S.categoria.destinazione = e.target.value; renderSheets(); }
  });

  // tasto Indietro (Android) o gesto indietro: chiude il pannello aperto
  window.addEventListener('popstate', () => {
    if (!S.bozza && !S.dettaglio && !S.conflitto && !S.categoria) return;
    S.bozza = null; S.dettaglio = null; S.conflitto = null; S.categoria = null;
    renderSheets();
  });

  // l'app va in background o si chiude con una casella budget ancora attiva: senza blur
  // il 'change' non scatta e il valore scritto si perde
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && document.activeElement) document.activeElement.blur();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (S.bozza || S.dettaglio || S.conflitto || S.categoria)) chiudiSheet();
  });
}
