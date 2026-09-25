/* Disegna la vista del tab corrente, gli sheet aperti e l'indicatore di salvataggio. */

import { S } from '../state.js';
import { nomeMese, orarioBreve } from '../core/formato.js';
import { vistaCasa } from './viste/casa.js';
import { vistaStorico } from './viste/storico.js';
import { vistaStats } from './viste/stats.js';
import { vistaImpostazioni } from './viste/impostazioni.js';
import { sheetAggiungi } from './sheet/aggiungi.js';
import { sheetDettaglio } from './sheet/dettaglio.js';
import { sheetConflitto } from './sheet/conflitto.js';

const VISTE = { casa: vistaCasa, storico: vistaStorico, stats: vistaStats, impostazioni: vistaImpostazioni };

export function aggiornaStatoSalvataggio() {
  const el = document.getElementById('statoSalva');
  if (!el) return;
  const [stato, testo] = S.scrivo ? ['file', 'Salvo…']
    : S.salvato.startsWith('errore') ? ['errore', 'Errore di scrittura']
    : S.dirHandle && !S.permessoCartella ? ['errore', 'Accesso scaduto']
    : S.dirHandle ? ['file', S.salvato === 'mai' ? 'Collegato' : 'Salvato ' + orarioBreve(S.dati.aggiornato)]
    : ['locale', 'Solo sul telefono'];
  el.dataset.stato = stato;
  el.querySelector('span').textContent = testo;
}

export function render() {
  document.getElementById('meseLabel').textContent = nomeMese(S.mese);
  document.querySelectorAll('.tab').forEach((t) => { t.dataset.on = t.dataset.tab === S.tab ? 1 : 0; });
  const main = document.getElementById('scroll');
  const y = main.scrollTop;
  main.innerHTML = (VISTE[S.tab] || vistaImpostazioni)();
  main.scrollTop = S.tab === S.ultimoTab ? y : 0;
  S.ultimoTab = S.tab;
  aggiornaStatoSalvataggio();
  renderSheets();
}

let ultimoSheet = '';

export function renderSheets() {
  const quale = S.conflitto ? 'conflitto' : S.bozza ? 'bozza' : S.dettaglio ? 'dettaglio' : '';
  const host = document.getElementById('sheets');
  // ridisegnare lo stesso pannello non ne ripete l'animazione di entrata
  host.dataset.fermo = quale && quale === ultimoSheet ? 1 : 0;
  ultimoSheet = quale;
  host.innerHTML = quale === 'conflitto' ? sheetConflitto() : quale === 'bozza' ? sheetAggiungi() : quale === 'dettaglio' ? sheetDettaglio() : '';
}

/* Un pannello aperto occupa una voce della cronologia: il tasto Indietro di Android
   lo chiude invece di uscire dall'app (vedi il popstate in eventi.js). */
export function apriSheet() {
  if (!(history.state && history.state.sheet)) history.pushState({ sheet: 1 }, '');
  renderSheets();
}

export function chiudiSheet() {
  S.bozza = null; S.dettaglio = null; S.conflitto = null;
  renderSheets();
  if (history.state && history.state.sheet) history.back();
}
