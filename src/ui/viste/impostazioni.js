/* Impostazioni: file collegato ed export, esclusioni dal portafoglio, budget del mese. */

import { S } from '../../state.js';
import { esc, nomeMese } from '../../core/formato.js';
import { FILENAME, ESCLUDIBILI } from '../../core/costanti.js';
import { delMese, escluse, uscitePerCategoria, righeBudget } from '../../core/calcoli.js';
import { supportaFS } from '../../storage/file.js';

const ICONA_FILE = '<svg width="17" height="20" viewBox="0 0 18 22" fill="none"><path d="M2 1.8h9l5 5v13.4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1Z" stroke="#5B4BC4" stroke-width="1.6"/><path d="M11 1.8V7h5" stroke="#5B4BC4" stroke-width="1.6"/></svg>';

function avvisoFile(collegato) {
  if (collegato) {
    return '<div class="avviso avviso--ok"><i></i><div>Salvataggio automatico attivo — ogni modifica riscrive il file.</div></div>';
  }
  return '<div class="avviso avviso--attenzione">' + (supportaFS
    ? 'I dati sono solo in questo browser. Collega una cartella (meglio se sincronizzata con Drive) per avere il file vero e il backup.'
    : 'Questo browser non può scrivere direttamente su file. Usa Chrome su Android, oppure esporta a mano con i pulsanti qui sotto.') + '</div>';
}

function sezioneFile() {
  const collegato = !!S.dirHandle;
  return '<div class="sect sect--primo">Il tuo file</div>'
    + '<div class="card file-card">'
    + '<div class="file-testa">'
    + '<div class="file-icona">' + ICONA_FILE + '</div>'
    + '<div class="file-testo"><div class="file-nome">' + FILENAME + '</div>'
    + '<div class="ell file-info">' + (collegato ? 'in ' + esc(S.dirHandle.name) + ' · salvato ' + esc(S.salvato) : 'nessuna cartella collegata') + '</div></div></div>'
    + avvisoFile(collegato)
    + (supportaFS ? '<button id="pickDir" class="cta">' + (collegato ? 'Cambia cartella' : 'Scegli la cartella') + '</button>' : '')
    + '<div class="export-riga">'
    + '<button id="expJson" class="btn-tenue">.json</button>'
    + '<button id="expCsv" class="btn-tenue">.csv</button>'
    + '<button id="expXlsx" class="btn-tenue">.xlsx</button>'
    + '</div>'
    + '<label class="importa">Importa un .json<input id="imp" type="file" accept="application/json,.json" hidden></label>'
    + '</div>';
}

function sezioneEsclusioni() {
  return '<div class="sect">Totale portafoglio</div>'
    + '<div class="card lista">'
    + '<div class="lista-nota">Categorie escluse dal calcolo, come nel foglio Excel.</div>'
    + ESCLUDIBILI.map((n) => {
        const on = escluse(S.dati, 'uscita').indexOf(n) >= 0;
        return '<button class="row" data-escl="' + esc(n) + '"><div class="riga-nome">' + n + '</div>'
          + '<div class="switch" data-on="' + (on ? 1 : 0) + '"><i></i></div></button>';
      }).join('')
    + '</div>';
}

function sezioneBudget() {
  const righe = righeBudget(S.dati, S.mese, uscitePerCategoria(delMese(S.dati.movimenti, S.mese)));
  return '<div class="sect">Budget · ' + nomeMese(S.mese) + '</div>'
    + '<div class="card lista">'
    + righe.map((b) =>
        '<div class="row"><i class="dot" style="background:' + b.colore + '"></i>'
        + '<div class="ell budget-nome">' + esc(b.nome) + '</div>'
        + '<div class="bud-box"><span>€</span>'
        + '<input class="bud num" data-cat="' + esc(b.nome) + '" value="' + b.bud + '" inputmode="decimal"></div></div>').join('')
    + '</div>';
}

export function vistaImpostazioni() {
  return sezioneFile()
    + sezioneEsclusioni()
    + sezioneBudget()
    + '<div class="piede">Butterflies in the wallet<br>' + S.dati.movimenti.length + ' movimenti salvati</div>';
}
