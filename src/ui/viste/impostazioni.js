/* Impostazioni: file collegato ed export, esclusioni dal portafoglio, categorie. */

import { S } from '../../state.js';
import { esc, quando } from '../../core/formato.js';
import { FILENAME, ESCLUDIBILI } from '../../core/costanti.js';
import { escluse, categoriaConRuolo, categorie } from '../../core/calcoli.js';
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

const ICONA_AVANTI = '<svg width="7" height="12" viewBox="0 0 8 13" fill="none"><path d="M1.5 1L6.5 6.5L1.5 12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

/* un tocco su una categoria la modifica; uscite ed entrate sono elenchi separati */
function sezioneCategorie(tipo, titolo) {
  return '<div class="sect">' + titolo + '</div>'
    + '<div class="card lista">'
    + categorie(S.dati, tipo).map((c) =>
        '<button class="row" data-cat-mod="' + tipo + '" data-nome="' + esc(c.nome) + '"><i class="dot" style="background:' + c.colore + '"></i>'
        + '<div class="ell riga-nome">' + esc(c.nome) + '</div><span class="riga-freccia">' + ICONA_AVANTI + '</span></button>').join('')
    + '<button class="row copia-riga" data-cat-nuova="' + tipo + '"><div class="riga-nome">+ Nuova categoria</div></button>'
    + '</div>';
}

export function vistaImpostazioni() {
  return sezioneFile()
    + sezioneEsclusioni()
    + sezioneCategorie('uscita', 'Categorie di uscita')
    + sezioneCategorie('entrata', 'Categorie di entrata')
    + '<div class="piede">Butterflies in the wallet<br>versione ' + __VERSIONE_APP__ + ' (' + __DATA_BUILD__ + ')<br>'
    + S.dati.movimenti.length + ' movimenti salvati</div>';
}
