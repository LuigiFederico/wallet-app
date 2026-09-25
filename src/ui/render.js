/* Disegna la vista del tab corrente, gli sheet aperti e l'indicatore di salvataggio. */

import { S } from '../state.js';
import { nomeMese } from '../core/formato.js';
import { vistaCasa } from './viste/casa.js';
import { vistaStorico } from './viste/storico.js';
import { vistaStats } from './viste/stats.js';
import { vistaImpostazioni } from './viste/impostazioni.js';
import { sheetAggiungi } from './sheet/aggiungi.js';
import { sheetDettaglio } from './sheet/dettaglio.js';

const VISTE = { casa: vistaCasa, storico: vistaStorico, stats: vistaStats, impostazioni: vistaImpostazioni };

export function aggiornaStatoSalvataggio() {
  const el = document.getElementById('statoSalva');
  if (!el) return;
  el.dataset.stato = S.salvato.startsWith('errore') ? 'errore' : S.dirHandle && S.permessoCartella ? 'file' : 'locale';
  el.querySelector('span').textContent = S.scrivo ? 'salvo…'
    : S.salvato === 'adesso' ? 'salvato adesso'
    : S.salvato === 'dal file' ? 'salvato'
    : S.salvato;
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

export function renderSheets() {
  document.getElementById('sheets').innerHTML = (S.bozza ? sheetAggiungi() : '') + (S.dettaglio ? sheetDettaglio() : '');
}
