/* Impostazioni: file collegato ed export, esclusioni dal portafoglio, budget del mese. */

import { S } from '../../state.js';
import { esc, eur, nomeMese, quando, meseInFrase } from '../../core/formato.js';
import { FILENAME, ESCLUDIBILI } from '../../core/costanti.js';
import { delMese, escluse, uscitePerCategoria, righeBudget, budgetDi, totaleBudget, meseBudgetPrecedente, categoriaConRuolo } from '../../core/calcoli.js';
import { supportaFS } from '../../storage/file.js';

const ICONA_FILE = '<svg width="17" height="20" viewBox="0 0 18 22" fill="none"><path d="M2 1.8h9l5 5v13.4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1Z" stroke="#5B4BC4" stroke-width="1.6"/><path d="M11 1.8V7h5" stroke="#5B4BC4" stroke-width="1.6"/></svg>';

function avvisoFile(collegato) {
  if (collegato && !S.permessoCartella) {
    return '<div class="avviso avviso--attenzione">Chrome ha sospeso l\'accesso alla cartella. Le modifiche sono al sicuro su questo telefono e le scrivo nel file appena riattivi'
      + ' (altrimenti il browser lo chiede al prossimo salvataggio). Scegli «Consenti a ogni visita» per non doverlo più rifare.</div>';
  }
  if (collegato) {
    return '<div class="avviso avviso--ok"><i></i><div>Salvataggio automatico attivo — ogni modifica riscrive il file.</div></div>';
  }
  return '<div class="avviso avviso--attenzione">' + (supportaFS
    ? 'I dati sono solo in questo browser. Collega una cartella (meglio se sincronizzata con Drive) per avere il file vero e il backup.'
    : 'Questo browser non può scrivere direttamente su file. Usa Chrome su Android, oppure esporta a mano con i pulsanti qui sotto.') + '</div>';
}

function statoFile() {
  if (!S.permessoCartella) return 'accesso da riattivare';
  if (S.salvato.startsWith('errore')) return 'errore di scrittura';
  return 'ultimo salvataggio ' + quando(S.dati.aggiornato);
}

function pulsantiCartella(collegato) {
  if (!supportaFS) return '';
  if (collegato && !S.permessoCartella) {
    return '<button id="riattiva" class="cta cta--accento">Riattiva l\'accesso a ' + esc(S.dirHandle.name) + '</button>'
      + '<button id="pickDir" class="link-btn link-btn--centro">Scegli un\'altra cartella</button>';
  }
  return '<button id="pickDir" class="cta">' + (collegato ? 'Cambia cartella' : 'Scegli la cartella') + '</button>';
}

function sezioneFile() {
  const collegato = !!S.dirHandle;
  return '<div class="sect sect--primo">Il tuo file</div>'
    + '<div class="card file-card">'
    + '<div class="file-testa">'
    + '<div class="file-icona">' + ICONA_FILE + '</div>'
    + '<div class="file-testo"><div class="file-nome">' + FILENAME + '</div>'
    + '<div class="ell file-info">' + (collegato ? 'in ' + esc(S.dirHandle.name) + ' · ' + statoFile() : 'nessuna cartella collegata') + '</div></div></div>'
    + avvisoFile(collegato)
    + pulsantiCartella(collegato)
    + '<div class="export-riga"><span class="export-lbl">Esporta</span>'
    + '<button id="expJson" class="btn-tenue">.json</button>'
    + '<button id="expCsv" class="btn-tenue">.csv</button>'
    + '<button id="expXlsx" class="btn-tenue">.xlsx</button>'
    + '</div>'
    + '<label class="importa">Importa un .json<input id="imp" type="file" accept="application/json,.json" hidden></label>'
    + '</div>';
}

/* interruttore acceso = la categoria conta nel totale (cioè non è esclusa) */
function sezioneEsclusioni() {
  return '<div class="sect">Conta nel totale portafoglio</div>'
    + '<div class="card lista">'
    + '<div class="lista-nota">Le categorie spente non entrano in Rimasto e Risparmio. Nei grafici restano visibili, in grigio.</div>'
    + ESCLUDIBILI.map((ruolo) => {
        // il nome è quello attuale della categoria con quel ruolo (prima tra le uscite)
        const tipo = categoriaConRuolo(S.dati, 'uscita', ruolo) ? 'uscita' : 'entrata';
        const c = categoriaConRuolo(S.dati, tipo, ruolo);
        if (!c) return '';
        const conta = escluse(S.dati, tipo).indexOf(c.nome) < 0;
        return '<button class="row" role="switch" aria-checked="' + conta + '" data-escl="' + ruolo + '"><div class="riga-nome">' + esc(c.nome) + '</div>'
          + '<div class="switch-stato' + (conta ? ' is-on' : '') + '">' + (conta ? 'Conta' : 'Non conta') + '</div>'
          + '<div class="switch" data-on="' + (conta ? 1 : 0) + '"><i></i></div></button>';
      }).join('')
    + '</div>';
}

/* mese senza budget: si riparte da quello dell'ultimo mese che ne ha uno */
function copiaBudget() {
  const da = !totaleBudget(budgetDi(S.dati, S.mese)).categorie && meseBudgetPrecedente(S.dati, S.mese);
  if (!da) return '';
  const t = totaleBudget(S.dati.budget[da]);
  return '<button class="row copia-riga" data-bud-copia="' + da + '"><div class="riga-nome">Copia da ' + meseInFrase(da, S.mese) + '</div>'
    + '<div class="copia-riga-info">' + t.categorie + (t.categorie === 1 ? ' categoria' : ' categorie') + ' · ' + eur(t.totale) + '</div></button>';
}

function sezioneBudget() {
  const righe = righeBudget(S.dati, S.mese, uscitePerCategoria(delMese(S.dati.movimenti, S.mese)));
  return '<div class="sect">Budget · ' + nomeMese(S.mese) + '</div>'
    + '<div class="card lista">'
    + copiaBudget()
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
