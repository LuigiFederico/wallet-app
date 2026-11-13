/* Sheet "aggiungi / modifica movimento". */

import { S } from '../../state.js';
import { esc, eurEsatto, oggiISO, ieriISO, dataBreve, parseImporto } from '../../core/formato.js';
import { categorie, colore } from '../../core/calcoli.js';
import { bozzaPronta } from '../../core/dati.js';
import { premi, calcola, haOperazioni, importoDaCalcolo, MAX_IMPORTO } from '../../core/calcolatrice.js';

const ICONA_CHIUDI = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICONA_GIU = '<svg class="pillola-freccia" width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="M1.5 1.5 6 6l4.5-4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONA_CALENDARIO = '<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 6h11M4.5 1v3M9.5 1v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

/* la farfalla che esce dal portafoglio quando si salva un'uscita */
const FARFALLA = '<svg class="farfalla" viewBox="0 0 44 36" fill="none" aria-hidden="true">'
  + '<g class="ala-sx"><path d="M21 17C17 6 8 1 3 4C-1 7 3 15 10 17C14 18 18 18 21 17Z" fill="#7B6BE0"/>'
  + '<path d="M21 19C15 20 7 23 7 29C7 33 13 34 17 29C19 26 21 22 21 19Z" fill="#5B4BC4"/><circle cx="9" cy="9" r="2" fill="#D9A441"/></g>'
  + '<g class="ala-dx"><path d="M23 17C27 6 36 1 41 4C45 7 41 15 34 17C30 18 26 18 23 17Z" fill="#7B6BE0"/>'
  + '<path d="M23 19C29 20 37 23 37 29C37 33 31 34 27 29C25 26 23 22 23 19Z" fill="#5B4BC4"/><circle cx="35" cy="9" r="2" fill="#D9A441"/></g>'
  + '<rect x="20.6" y="11" width="2.8" height="18" rx="1.4" fill="#16130F"/>'
  + '<path d="M21.3 11.5C20.5 8 19 6 17.5 5M22.7 11.5C23.5 8 25 6 26.5 5" stroke="#16130F" stroke-width="1.1" stroke-linecap="round"/></svg>';

const ICONA_CANCELLA = '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true"><path d="M7.6 1.5h12.4a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H7.6a1.5 1.5 0 0 1-1.1-.5L1.5 9l5-6.5a1.5 1.5 0 0 1 1.1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m11 6 6 6m0-6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const ICONA_AZZERA = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="9" fill="currentColor"/><path d="m6 6 6 6m0-6-6 6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>';

const TASTI = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', ',', '0', '⌫', '+'];
const NOMI_TASTI = { '÷': 'diviso', '×': 'per', '−': 'meno', '+': 'più', '⌫': 'Cancella', ',': 'virgola' };

function importo(b) {
  const n = parseImporto(b.importo);
  return n > 0 ? n : 0;
}

function testoCta(b) {
  if (!importo(b)) return 'Inserisci l\'importo';
  if (!b.categoria) return 'Scegli una categoria';
  return (b.id ? 'Salva modifiche' : 'Salva ' + b.tipo) + ' · ' + eurEsatto(importo(b));
}

/* lo schermo della calcolatrice: il conto in piccolo sopra (con un operatore o una virgola in sospeso),
   il risultato in grande, sempre come importo in euro */
function schermo(b) {
  const c = b.calcolo;
  if (!c) return '<div class="calc-conto"></div><div class="calc-totale is-vuoto">0 €</div>';
  const n = calcola(c), operazioni = haOperazioni(c);
  const conto = /[+−×÷]|,$/.test(c) ? c.replace(/([+−×÷])/g, ' $1 ') : '';
  const errore = isNaN(n) ? 'Non si può dividere per zero'
    : n < 0 || (n === 0 && operazioni) ? eurEsatto(n) + ': deve essere più di zero'
    : n > MAX_IMPORTO && !b.sostituisci ? 'Importo troppo grande' : '';
  if (errore) return '<div class="calc-conto">' + conto + '</div><div class="calc-errore">' + errore + '</div>';
  const totale = eurEsatto(n);
  return '<div class="calc-conto">' + conto + '</div>'
    + '<div class="calc-totale' + (n === 0 ? ' is-vuoto' : totale.length > 13 ? ' is-lunghissimo' : totale.length > 9 ? ' is-lungo' : '')
    + (b.sostituisci ? ' is-selezionato' : '') + '">' + totale + '</div>';
}

function coloreScelto(b) {
  return b.categoria ? colore(S.dati, b.categoria, b.tipo) : 'transparent';
}

/* 'Oggi · 13 nov', 'Ieri · 12 nov', '5 nov' (con l'anno se non è quello in corso) */
function testoGiorno(b) {
  const oggi = oggiISO(), giorno = dataBreve(b.data);
  if (b.data === oggi) return 'Oggi · ' + giorno;
  if (b.data === ieriISO()) return 'Ieri · ' + giorno;
  return giorno + (b.data.slice(0, 4) !== oggi.slice(0, 4) ? ' ' + b.data.slice(0, 4) : '');
}

export function sheetAggiungi() {
  const b = S.bozza;
  const cats = categorie(S.dati, b.tipo).slice().sort((x, y) => x.nome.localeCompare(y.nome, 'it'));
  return '<div class="sheet" id="sheetAdd"><div class="scrim" data-close="1"></div>'
    + '<div class="panel" role="dialog" aria-labelledby="sheetAddTitolo" tabindex="-1">'
    + '<div class="sheet-testa"><h2 id="sheetAddTitolo" class="sheet-titolo">' + (b.id ? 'Modifica movimento' : 'Nuovo movimento') + '</h2>'
    + '<button class="icon-btn" data-close="1" aria-label="Chiudi">' + ICONA_CHIUDI + '</button></div>'
    + '<div class="seg">'
    + '<button data-tipo="uscita" data-on="' + (b.tipo === 'uscita' ? 1 : 0) + '">Uscita</button>'
    + '<button data-tipo="entrata" data-on="' + (b.tipo === 'entrata' ? 1 : 0) + '">Entrata</button></div>'
    + '<div class="calc-schermo"><div id="f-schermo" class="calc-righe" role="status">' + schermo(b) + '</div>'
    + '<button class="calc-azzera" data-tasto="C" aria-label="Cancella tutto"' + (b.calcolo ? '' : ' hidden') + '>' + ICONA_AZZERA + '</button></div>'
    + '<div class="pillole">'
    + '<label class="pillola"><i id="f-cat-dot" class="dot" style="background:' + coloreScelto(b) + '"></i>'
    + '<span id="f-cat-testo" class="pillola-testo">' + (b.categoria ? esc(b.categoria) : 'Categoria') + '</span>' + ICONA_GIU
    + '<select class="pillola-select" id="f-cat" aria-label="Categoria"><option value="">Scegli…</option>'
    + cats.map((c) => '<option value="' + esc(c.nome) + '"' + (b.categoria === c.nome ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('')
    + '</select></label>'
    + '<label class="pillola">' + ICONA_CALENDARIO + '<span id="f-giorno-testo" class="pillola-testo">' + testoGiorno(b) + '</span>' + ICONA_GIU
    + '<input class="pillola-select pillola-data" id="f-data" type="date" aria-label="Data" value="' + b.data + '"></label>'
    + '</div>'
    + '<input class="field field--nota" id="f-desc" aria-label="Descrizione (facoltativa)" placeholder="Descrizione (facoltativa)" value="' + esc(b.descrizione) + '">'
    + '<div class="tastierino" role="group" aria-label="Calcolatrice">'
    + TASTI.map((t) => '<button class="tasto' + ('+−×÷'.includes(t) ? ' tasto--op' : '') + '" data-tasto="' + t + '"'
        + (NOMI_TASTI[t] ? ' aria-label="' + NOMI_TASTI[t] + '"' : '') + '>' + (t === '⌫' ? ICONA_CANCELLA : t) + '</button>').join('')
    + '</div>'
    + '<button id="salvaMov" class="cta cta--salva"' + (bozzaPronta(b) ? '' : ' disabled') + '>'
    + '<span class="salva-tasca" aria-hidden="true"></span>'
    + '<span class="salva-testo">' + testoCta(b) + '</span>'
    + '<span class="salva-lembo" aria-hidden="true"><span class="salva-fermaglio"></span></span></button>'
    + '</div>' + FARFALLA + '</div>';
}

/* Un tasto della calcolatrice (anche dalla tastiera fisica): aggiorna il calcolo e l'importo della bozza.
   Appena aperta una modifica, una cifra o la virgola ricominciano da capo invece di accodarsi all'importo salvato. */
export function premiTasto(tasto) {
  const b = S.bozza;
  const base = b.sostituisci && /^[\d,]$/.test(tasto) ? '' : b.calcolo;
  b.sostituisci = false;
  b.calcolo = tasto === 'C' ? '' : premi(base, tasto);
  b.importo = importoDaCalcolo(b.calcolo);
  aggiornaForm();
}

/* Aggiorna schermo, pulsante, pallino e data senza ridisegnare il form mentre si scrive. */
export function aggiornaForm() {
  const b = S.bozza, btn = document.getElementById('salvaMov');
  if (!btn || !b) return;
  btn.disabled = !bozzaPronta(b);
  btn.querySelector('.salva-testo').textContent = testoCta(b);
  document.getElementById('f-schermo').innerHTML = schermo(b);
  document.querySelector('.calc-azzera').hidden = !b.calcolo;
  document.getElementById('f-cat-dot').style.background = coloreScelto(b);
  document.getElementById('f-cat-testo').textContent = b.categoria || 'Categoria';
  document.getElementById('f-giorno-testo').textContent = testoGiorno(b);
}

/* Salvataggio di un'uscita: il pulsante diventa un portafoglio, ne esce una farfalla e il pannello scende.
   Il pannello passa fuori da #sheets, così i ridisegni dopo il salvataggio non lo cancellano a metà.
   Ritorna dopo quanti ms mostrare il messaggio di conferma (0 = subito, senza animazione). */
export function animaSalvataggio() {
  const el = document.getElementById('sheetAdd');
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  if (document.activeElement) document.activeElement.blur(); // chiude la tastiera
  el.removeAttribute('id');
  el.classList.add('is-salvo');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2150);
  return 1550;
}
