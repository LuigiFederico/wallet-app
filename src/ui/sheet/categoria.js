/* Sheet "nuova / modifica categoria": nome, colore, elimina (spostando i movimenti). */

import { S } from '../../state.js';
import { PALETTE } from '../../core/costanti.js';
import { esc } from '../../core/formato.js';
import { categorie } from '../../core/calcoli.js';
import { erroreNomeCategoria, usoCategoria } from '../../core/dati.js';

const ICONA_CHIUDI = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICONA_GIU = '<svg class="select-freccia" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1.5 1.5 6 6l4.5-4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function errore(c) {
  return erroreNomeCategoria(S.dati, c.tipo, c.nome, c.originale);
}

/* il colore attuale resta sceglibile anche se non è nella tavolozza */
function colori(c) {
  const lista = PALETTE.indexOf(c.colore) < 0 ? PALETTE.concat(c.colore) : PALETTE;
  return '<div class="colori">' + lista.map((col) => '<button class="colore" data-colore="' + col + '" style="background:' + col + '"'
    + ' aria-label="Colore ' + col + '" aria-pressed="' + (col === c.colore) + '"></button>').join('') + '</div>';
}

function riepilogoUso(u) {
  const mov = u.movimenti === 1 ? '1 movimento' : u.movimenti + ' movimenti';
  return u.movimenti && u.budget ? mov + ' e i budget' : u.movimenti ? mov : 'I budget';
}

function formModifica(c) {
  const err = c.nome.trim() ? errore(c) : '';
  const eliminabile = c.originale && categorie(S.dati, c.tipo).length > 1;
  return '<div class="campi">'
    + '<div class="campo"><label class="lbl" for="c-nome">Nome</label>'
    + '<input class="field field--testo" id="c-nome" autocomplete="off" value="' + esc(c.nome) + '">'
    + '<div id="c-errore" class="lettura-riga"><span class="lettura is-errore">' + esc(err) + '</span></div></div>'
    + '<div class="campo"><div class="lbl">Colore</div>' + colori(c) + '</div></div>'
    + '<button id="salvaCat" class="cta cta--salva"' + (errore(c) ? ' disabled' : '') + '>' + (c.originale ? 'Salva modifiche' : 'Aggiungi categoria') + '</button>'
    + (eliminabile ? '<button id="eliminaCat" class="btn-chiudi cat-elimina">Elimina categoria</button>' : '');
}

/* la categoria ha movimenti o budget: si sceglie dove spostarli */
function formElimina(c) {
  const altre = categorie(S.dati, c.tipo).filter((x) => x.nome !== c.originale);
  return '<p class="conf-testo">' + riepilogoUso(usoCategoria(S.dati, c.tipo, c.originale)) + ' di <strong>' + esc(c.originale)
    + '</strong> passano alla categoria che scegli. I budget si sommano a quelli che ha già.</p>'
    + '<div class="campo"><label class="lbl" for="c-dest">Sposta in</label>'
    + '<div class="select-box"><select class="field" id="c-dest"><option value="">Scegli…</option>'
    + altre.map((x) => '<option value="' + esc(x.nome) + '"' + (c.destinazione === x.nome ? ' selected' : '') + '>' + esc(x.nome) + '</option>').join('')
    + '</select>' + ICONA_GIU + '</div></div>'
    + '<button id="confElimina" class="cta cta--salva cat-conferma"' + (c.destinazione ? '' : ' disabled') + '>Elimina e sposta</button>'
    + '<button id="annullaElimina" class="btn-chiudi">Annulla</button>';
}

export function sheetCategoria() {
  const c = S.categoria;
  const titolo = c.eliminando ? 'Elimina ' + c.originale
    : c.originale ? 'Modifica categoria' : c.tipo === 'uscita' ? 'Nuova categoria di uscita' : 'Nuova categoria di entrata';
  return '<div class="sheet" id="sheetCat"><div class="scrim" data-close="1"></div>'
    + '<div class="panel" role="dialog" aria-labelledby="sheetCatTitolo">'
    + '<div class="sheet-testa"><h2 id="sheetCatTitolo" class="ell sheet-titolo">' + esc(titolo) + '</h2>'
    + '<button class="icon-btn" data-close="1" aria-label="Chiudi">' + ICONA_CHIUDI + '</button></div>'
    + (c.eliminando ? formElimina(c) : formModifica(c))
    + '</div></div>';
}

/* Aggiorna errore e pulsante mentre si scrive il nome, senza ridisegnare il campo. */
export function aggiornaCategoria() {
  const c = S.categoria, btn = document.getElementById('salvaCat');
  if (!btn || !c) return;
  const err = errore(c);
  btn.disabled = !!err;
  document.querySelector('#c-errore .lettura').textContent = c.nome.trim() ? err : '';
}
