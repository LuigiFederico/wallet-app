/* Collegamento degli eventi: header, tab bar, contenuto (delegato) e sheet. */

import { S } from '../state.js';
import { LS_BANNER } from '../core/costanti.js';
import { oggiISO } from '../core/formato.js';
import { PALETTE } from '../core/costanti.js';
import { bozzaPronta, movimentoDaBozza, bozzaDaMovimento, usoCategoria } from '../core/dati.js';
import { categorie, colore } from '../core/calcoli.js';
import {
  aggiungi, modifica, elimina, duplica, toggleRimborso, setBudget, copiaBudget, budgetDaMedia, toggleEsclusione,
  spostaMese, meseCorrente, importaJson, salvaCategoria, rimuoviCategoria
} from '../azioni.js';
import { scegliCartella, riattivaAccesso, confermaVersione } from '../persistenza.js';
import { exportJson, exportCsv, exportXlsx } from '../export/index.js';
import { render, renderSheets, apriSheet, chiudiSheet } from './render.js';
import { aggiornaForm, animaSalvataggio, premiTasto } from './sheet/aggiungi.js';
import { aggiornaCategoria } from './sheet/categoria.js';

function vaiA(tab) { S.tab = tab; render(); }

/* Il focus va sul pannello all'apertura: lascia il + (Invio e Spazio lo ripremerebbero, azzerando la bozza). */
function focusPannello() {
  const p = document.querySelector('#sheetAdd .panel');
  if (p) p.focus({ preventScroll: true });
}

function apriAggiungi() {
  S.bozza = { tipo: 'uscita', data: oggiISO(), importo: '', calcolo: '', categoria: '', descrizione: '' };
  apriSheet();
  focusPannello();
}

function apriModifica() {
  S.bozza = bozzaDaMovimento(S.dettaglio);
  S.dettaglio = null;
  renderSheets();
  focusPannello();
}

function salvaBozza() {
  const b = S.bozza;
  if (!bozzaPronta(b)) return;
  // un'uscita "esce dal portafoglio": animazione, e il messaggio arriva quando è finita
  const ritardo = b.tipo === 'uscita' ? animaSalvataggio() : 0;
  chiudiSheet();
  if (b.id) modifica(b, ritardo); else aggiungi(movimentoDaBozza(S.dati, b), ritardo);
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
  ['[data-go]', (el) => { if (el.dataset.goVista) S.vista = el.dataset.goVista; vaiA(el.dataset.go); }],
  ['[data-det]', (el) => { S.dettaglio = S.dati.movimenti.find((m) => m.id === el.dataset.det) || null; apriSheet(); }],
  ['[data-filtro]', (el) => { S.filtro = el.dataset.filtro; render(); }],
  // «Modifica budget» è in fondo alla vista Mese: la vista nuova si apre dall'inizio
  ['[data-vista]', (el) => {
    const cambia = S.vista !== el.dataset.vista;
    S.vista = el.dataset.vista; S.chiediMedia = null; render();
    if (cambia) document.getElementById('scroll').scrollTop = 0;
  }],
  ['[data-mese]', (el) => { S.mese = el.dataset.mese; if (S.vista !== 'categoria') S.vista = 'mese'; render(); }],
  ['[data-escl]', (el) => toggleEsclusione(el.dataset.escl)],
  ['[data-bud-copia]', (el) => copiaBudget(el.dataset.budCopia)],
  ['[data-bud-media]', (el) => {
    const a = el.dataset.budMedia;
    if (a === 'tutti' || a === 'vuote') { budgetDaMedia(a === 'vuote'); return; }
    S.chiediMedia = a === 'chiedi' ? S.mese : null; render();
  }],
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
  // il ridisegno cancella il pulsante: da tastiera (detail 0) il focus torna sullo stesso tipo, col mouse sul pannello
  ['[data-tipo]', (el, e) => {
    S.bozza.tipo = el.dataset.tipo; S.bozza.categoria = ''; renderSheets();
    if (e.detail) focusPannello(); else document.querySelector('[data-tipo="' + S.bozza.tipo + '"]').focus();
  }],
  ['[data-tasto]', (el) => {
    // un tasto chiude la tastiera del telefono aperta sulla descrizione
    if (document.activeElement && document.activeElement.id === 'f-desc') document.activeElement.blur();
    premiTasto(el.dataset.tasto);
    if (el.dataset.tasto === 'C') focusPannello(); // il pulsante si nasconde: il focus non deve cadere sulla pagina
  }],
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

const TASTI_FISICI = { ',': ',', '.': ',', '+': '+', '-': '−', '*': '×', x: '×', '/': '÷', Backspace: '⌫', Delete: '⌫' };

/* Un pannello con la maniglia si chiude trascinandolo verso il basso, solo col tocco (col mouse ci sono
   il velo, Esc e la maniglia stessa). Il trascinamento parte dalla parte alta (maniglia, Uscita/Entrata,
   importo), non dal tastierino o dai campi, così un dito che scivola mentre si scrive non butta la bozza.
   Sotto un quarto dell'altezza (al massimo 120px) il pannello torna su. */
const ZONA_TRASCINA = '.maniglia, .seg, .calc-schermo';

function trascinaPerChiudere(sheets) {
  let g = null; // trascinamento in corso: { panel, x, y, dy, attivo }
  let bloccaClic = null; // dopo un trascinamento, il clic sullo stesso elemento non conta come tocco

  function muovi(e) {
    const t = e.touches[0], dx = Math.abs(t.clientX - g.x);
    g.dy = t.clientY - g.y;
    if (!g.attivo) {
      if (Math.abs(g.dy) < 8 && dx < 8) return;
      // solo in giù e più in verticale che in orizzontale; altrimenti decide il browser
      if (g.dy < 8 || dx > g.dy) { rilascia(false); return; }
      g.attivo = true;
      g.panel.style.animation = 'none'; // l'animazione di entrata altrimenti coprirebbe lo spostamento
      g.panel.style.transition = 'none';
    }
    e.preventDefault();
    g.panel.style.transform = 'translateY(' + Math.max(0, g.dy) + 'px)';
  }

  // fine del tocco: chiude se è sceso abbastanza, altrimenti torna su (anche se il tocco è stato annullato)
  function rilascia(chiudi) {
    const { panel, attivo, dy } = g;
    panel.removeEventListener('touchmove', muovi);
    g = null;
    if (!attivo) return;
    panel.style.transition = 'transform .2s ease';
    if (chiudi && dy > Math.min(120, panel.offsetHeight / 4)) {
      const bozza = S.bozza;
      panel.style.transform = 'translateY(100%)';
      // chiude solo se nel frattempo non è cambiato niente (es. è comparso il pannello del conflitto)
      setTimeout(() => { if (S.bozza === bozza && !S.conflitto) chiudiSheet(); }, 200);
    } else panel.style.transform = '';
  }

  sheets.addEventListener('touchstart', (e) => {
    if (g) { if (g.attivo) return; rilascia(false); } // un secondo dito non interrompe il trascinamento
    const panel = e.target.closest('.panel--maniglia');
    if (!panel || e.touches.length > 1 || panel.scrollTop > 0 || !e.target.closest(ZONA_TRASCINA)) return;
    g = { panel, x: e.touches[0].clientX, y: e.touches[0].clientY, dy: 0, attivo: false, origine: e.target };
    // il touchmove che blocca lo scorrimento sta solo su questo pannello e solo durante il tocco
    panel.addEventListener('touchmove', muovi, { passive: false });
  }, { passive: true });
  sheets.addEventListener('touchend', (e) => {
    if (!g || e.touches.length) return;
    if (g.attivo) bloccaClic = { el: g.origine, fino: Date.now() + 400 };
    rilascia(true);
  });
  sheets.addEventListener('touchcancel', () => { if (g) rilascia(false); });
  sheets.addEventListener('click', (e) => {
    if (bloccaClic && Date.now() < bloccaClic.fino && bloccaClic.el.contains(e.target)) { e.stopPropagation(); e.preventDefault(); }
    bloccaClic = null;
  }, true);
}

function delega(gestori) {
  return (e) => {
    for (const [sel, fn] of gestori) {
      const el = e.target.closest(sel);
      if (el) { fn(el, e); return; }
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
    if (e.target.id === 'statCat') {
      const i = e.target.value.indexOf(':');
      S.catStats = { tipo: e.target.value.slice(0, i), nome: e.target.value.slice(i + 1) };
      render();
    }
  });

  const sheets = document.getElementById('sheets');
  sheets.addEventListener('click', delega(CLICK_SHEET));
  trascinaPerChiudere(sheets);
  // un clic del mouse non lascia il focus su un tasto del tastierino (Spazio e Invio lo ripeterebbero);
  // tocchi e lettori di schermo restano come sono
  let puntatore = '';
  sheets.addEventListener('pointerdown', (e) => { puntatore = e.pointerType; });
  sheets.addEventListener('mousedown', (e) => { if (puntatore === 'mouse' && e.target.closest('[data-tasto]')) e.preventDefault(); });
  sheets.addEventListener('input', (e) => {
    if (S.categoria && e.target.id === 'c-nome') { S.categoria.nome = e.target.value; aggiornaCategoria(); }
    if (!S.bozza) return;
    if (e.target.id === 'f-data' && e.target.value) S.bozza.data = e.target.value;
    if (e.target.id === 'f-desc') S.bozza.descrizione = e.target.value;
    if (e.target.id === 'f-data') aggiornaForm();
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
    if (e.key === 'Escape' && (S.bozza || S.dettaglio || S.conflitto || S.categoria)) { chiudiSheet(); return; }
    // con il form aperto la tastiera fisica scrive nella calcolatrice, anche dopo aver scelto data o categoria;
    // solo la descrizione tiene per sé quello che si scrive
    if (!document.getElementById('sheetAdd') || e.ctrlKey || e.metaKey || e.altKey || e.target.id === 'f-desc') return;
    const tasto = TASTI_FISICI[e.key] || (/^\d$/.test(e.key) ? e.key : '');
    if (tasto) { e.preventDefault(); premiTasto(tasto); }
    else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); salvaBozza(); }
  });
}
