/* Sheet "aggiungi movimento". */

import { S } from '../../state.js';
import { esc } from '../../core/formato.js';
import { categorie } from '../../core/calcoli.js';
import { bozzaPronta } from '../../core/dati.js';

function testoCta(b) {
  return b.categoria ? 'Salva ' + b.tipo : 'Scegli una categoria';
}

function campo(etichetta, input) {
  return '<div class="campo"><div class="lbl">' + etichetta + '</div>' + input + '</div>';
}

export function sheetAggiungi() {
  const b = S.bozza;
  return '<div class="sheet" id="sheetAdd"><div class="scrim" data-close="1"></div><div class="panel">'
    + '<div class="grab"></div>'
    + '<div class="seg">'
    + '<button data-tipo="uscita" data-on="' + (b.tipo === 'uscita' ? 1 : 0) + '">Uscita</button>'
    + '<button data-tipo="entrata" data-on="' + (b.tipo === 'entrata' ? 1 : 0) + '">Entrata</button></div>'
    + '<div class="campi">'
    + campo('Data', '<input class="field" id="f-data" type="date" value="' + b.data + '">')
    + campo('Importo', '<input class="field field--importo num" id="f-imp" inputmode="decimal" placeholder="0,00" value="' + esc(b.importo) + '">')
    + campo('Categoria', '<select class="field" id="f-cat"><option value="">Scegli…</option>'
        + categorie(S.dati, b.tipo).map((c) => '<option value="' + esc(c.nome) + '"' + (b.categoria === c.nome ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('')
        + '</select>')
    + campo('Descrizione', '<input class="field field--testo" id="f-desc" placeholder="Es. Esselunga" value="' + esc(b.descrizione) + '">')
    + '</div>'
    + '<button id="salvaMov" class="cta cta--salva"' + (bozzaPronta(b) ? '' : ' disabled') + '>' + testoCta(b) + '</button>'
    + '</div></div>';
}

/* Aggiorna solo il pulsante, senza ridisegnare il form mentre si scrive. */
export function aggiornaCta() {
  const btn = document.getElementById('salvaMov');
  if (!btn || !S.bozza) return;
  btn.disabled = !bozzaPronta(S.bozza);
  btn.textContent = testoCta(S.bozza);
}
