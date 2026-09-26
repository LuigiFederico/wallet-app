/* Sheet "aggiungi / modifica movimento". */

import { S } from '../../state.js';
import { esc, eurEsatto, oggiISO, ieriISO, dataBreve, parseImporto } from '../../core/formato.js';
import { categorie, colore } from '../../core/calcoli.js';
import { bozzaPronta } from '../../core/dati.js';

const ICONA_CHIUDI = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICONA_OK = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.3 5.6 10.2 11.5 3.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONA_GIU = '<svg class="select-freccia" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1.5 1.5 6 6l4.5-4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONA_CALENDARIO = '<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 6h11M4.5 1v3M9.5 1v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

/* la farfalla che esce dal portafoglio quando si salva un'uscita */
const FARFALLA = '<svg class="farfalla" viewBox="0 0 44 36" fill="none" aria-hidden="true">'
  + '<g class="ala-sx"><path d="M21 17C17 6 8 1 3 4C-1 7 3 15 10 17C14 18 18 18 21 17Z" fill="#7B6BE0"/>'
  + '<path d="M21 19C15 20 7 23 7 29C7 33 13 34 17 29C19 26 21 22 21 19Z" fill="#5B4BC4"/><circle cx="9" cy="9" r="2" fill="#D9A441"/></g>'
  + '<g class="ala-dx"><path d="M23 17C27 6 36 1 41 4C45 7 41 15 34 17C30 18 26 18 23 17Z" fill="#7B6BE0"/>'
  + '<path d="M23 19C29 20 37 23 37 29C37 33 31 34 27 29C25 26 23 22 23 19Z" fill="#5B4BC4"/><circle cx="35" cy="9" r="2" fill="#D9A441"/></g>'
  + '<rect x="20.6" y="11" width="2.8" height="18" rx="1.4" fill="#16130F"/>'
  + '<path d="M21.3 11.5C20.5 8 19 6 17.5 5M22.7 11.5C23.5 8 25 6 26.5 5" stroke="#16130F" stroke-width="1.1" stroke-linecap="round"/></svg>';

function importo(b) {
  const n = parseImporto(b.importo);
  return n > 0 ? n : 0;
}

function testoCta(b) {
  if (!b.categoria) return 'Scegli una categoria';
  if (!importo(b)) return 'Inserisci l\'importo';
  return (b.id ? 'Salva modifiche' : 'Salva ' + b.tipo) + ' · ' + eurEsatto(importo(b));
}

/* come è stato letto l'importo: un separatore sbagliato si vede prima di salvare */
function lettura(b) {
  if (String(b.importo).trim() === '') return '';
  return importo(b)
    ? '<span class="lettura">' + ICONA_OK + 'Letto come ' + eurEsatto(importo(b)) + '</span>'
    : '<span class="lettura is-errore">Importo non valido: scrivi per esempio 12,50</span>';
}

function coloreScelto(b) {
  return b.categoria ? colore(S.dati, b.categoria, b.tipo) : 'transparent';
}

function chip(giorno, on, testo) {
  return '<button class="chip chip--data" data-giorno="' + giorno + '" data-on="' + (on ? 1 : 0) + '" aria-pressed="' + on + '">' + testo + '</button>';
}

function chipGiorni(b) {
  const oggi = oggiISO(), ieri = ieriISO(), altra = b.data !== oggi && b.data !== ieri;
  const anno = b.data.slice(0, 4) !== oggi.slice(0, 4) ? ' ' + b.data.slice(0, 4) : '';
  return chip('oggi', b.data === oggi, 'Oggi · ' + dataBreve(oggi))
    + chip('ieri', b.data === ieri, 'Ieri')
    + chip('altra', altra, ICONA_CALENDARIO + (altra ? dataBreve(b.data) + anno : 'Altra data'));
}

function campo(etichetta, id, input) {
  return '<div class="campo"><label class="lbl" for="' + id + '">' + etichetta + '</label>' + input + '</div>';
}

export function sheetAggiungi() {
  const b = S.bozza;
  const cats = categorie(S.dati, b.tipo).slice().sort((x, y) => x.nome.localeCompare(y.nome, 'it'));
  return '<div class="sheet" id="sheetAdd"><div class="scrim" data-close="1"></div>'
    + '<div class="panel" role="dialog" aria-labelledby="sheetAddTitolo">'
    + '<div class="sheet-testa"><h2 id="sheetAddTitolo" class="sheet-titolo">' + (b.id ? 'Modifica movimento' : 'Nuovo movimento') + '</h2>'
    + '<button class="icon-btn" data-close="1" aria-label="Chiudi">' + ICONA_CHIUDI + '</button></div>'
    + '<div class="seg">'
    + '<button data-tipo="uscita" data-on="' + (b.tipo === 'uscita' ? 1 : 0) + '">Uscita</button>'
    + '<button data-tipo="entrata" data-on="' + (b.tipo === 'entrata' ? 1 : 0) + '">Entrata</button></div>'
    + '<div class="campi">'
    + campo('Importo', 'f-imp', '<div class="importo-box"><span>€</span>'
        + '<input class="field--importo num" id="f-imp" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + esc(b.importo) + '"></div>'
        + '<div id="f-lettura" class="lettura-riga">' + lettura(b) + '</div>')
    + campo('Categoria', 'f-cat', '<div class="select-box"><i id="f-cat-dot" class="dot select-dot" style="background:' + coloreScelto(b) + '"></i>'
        + '<select class="field field--select" id="f-cat"><option value="">Scegli…</option>'
        + cats.map((c) => '<option value="' + esc(c.nome) + '"' + (b.categoria === c.nome ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('')
        + '</select>' + ICONA_GIU + '</div>')
    + '<div class="campo"><div class="lbl">Data</div><div class="chips chips--data" id="f-giorni">' + chipGiorni(b) + '</div>'
    + '<input class="field data-nascosta" id="f-data" type="date" tabindex="-1" aria-label="Altra data" value="' + b.data + '"></div>'
    + campo('Descrizione <span class="lbl-nota">(facoltativa)</span>', 'f-desc', '<input class="field field--testo" id="f-desc" placeholder="Es. Esselunga" value="' + esc(b.descrizione) + '">')
    + '</div>'
    + '<button id="salvaMov" class="cta cta--salva"' + (bozzaPronta(b) ? '' : ' disabled') + '>'
    + '<span class="salva-tasca" aria-hidden="true"></span>'
    + '<span class="salva-testo">' + testoCta(b) + '</span>'
    + '<span class="salva-lembo" aria-hidden="true"><span class="salva-fermaglio"></span></span></button>'
    + '</div>' + FARFALLA + '</div>';
}

/* Aggiorna pulsante, lettura dell'importo, pallino e date senza ridisegnare il form mentre si scrive. */
export function aggiornaForm() {
  const b = S.bozza, btn = document.getElementById('salvaMov');
  if (!btn || !b) return;
  btn.disabled = !bozzaPronta(b);
  btn.querySelector('.salva-testo').textContent = testoCta(b);
  document.getElementById('f-lettura').innerHTML = lettura(b);
  document.getElementById('f-cat-dot').style.background = coloreScelto(b);
  document.getElementById('f-giorni').innerHTML = chipGiorni(b);
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
