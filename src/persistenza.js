/* Salvataggio dei dati: sempre in localStorage, e nel file se c'è una cartella collegata. */

import { S } from './state.js';
import { FILENAME, LS_KEY, LS_BANNER } from './core/costanti.js';
import { normalizza, nomeBackup } from './core/dati.js';
import { oggiISO } from './core/formato.js';
import { supportaFS, chiediCartella, permessoAttivo, riattivaPermesso, leggiFile, scriviFile } from './storage/file.js';
import { salvaHandle, leggiHandle } from './storage/handle-db.js';
import { render, apriSheet, chiudiSheet, aggiornaStatoSalvataggio } from './ui/render.js';
import { toast } from './ui/toast.js';

// "aggiornato" dell'ultimo salvataggio su questo dispositivo ('' = mai salvato)
let ultimoSalvato = '';

export function serializza(dati) {
  return JSON.stringify(dati, null, 1);
}

export async function salva() {
  const precedente = ultimoSalvato;
  S.dati.aggiornato = ultimoSalvato = new Date().toISOString();
  const json = serializza(S.dati);
  try { localStorage.setItem(LS_KEY, json); } catch (e) {}
  if (!S.dirHandle) { S.salvato = 'solo su questo telefono'; return; }
  if (!S.permessoCartella && !(await riattivaCartella(precedente))) return;
  try {
    S.scrivo = true; aggiornaStatoSalvataggio();
    await scriviFile(S.dirHandle, json);
    S.salvato = 'adesso';
  } catch (e) {
    S.salvato = 'errore di scrittura';
    toast('Scrittura non riuscita, ma i dati sono al sicuro su questo telefono. Ricollega la cartella dalle impostazioni.');
  } finally {
    S.scrivo = false; aggiornaStatoSalvataggio();
  }
}

/* Dopo un riavvio Chrome chiede di nuovo il permesso sulla cartella già scelta
   (con "Consenti a ogni visita" non lo chiede più). Se nel frattempo il file è stato
   aggiornato altrove, vince il più recente. Ritorna true se si deve scrivere il file. */
async function riattivaCartella(precedente) {
  if (!(await riattivaPermesso(S.dirHandle))) {
    S.salvato = 'permesso da riattivare'; aggiornaStatoSalvataggio();
    return false;
  }
  S.permessoCartella = true;
  const file = await leggiFile(S.dirHandle);
  if (!file || !(String(file.aggiornato || '') > precedente)) return true;
  // il file è più recente dei dati di prima di questa modifica: caricarlo la perde.
  // Finché non si sceglie niente scritture sul file: "Decidi più tardi" lo richiede al prossimo salvataggio.
  S.permessoCartella = false;
  chiediVersione(S.dirHandle, file, 'riattiva');
  return false;
}

/* Pulsante "Riattiva l'accesso" delle impostazioni: chiede il permesso subito
   invece di aspettare il prossimo salvataggio. */
export async function riattivaAccesso() {
  if (await riattivaCartella(ultimoSalvato)) await salva();
  render();
}

/* stessi dati, a parte l'istante dell'ultimo salvataggio */
function stessiDati(file, dati) {
  const senzaData = (d) => JSON.stringify(Object.assign({}, d, { aggiornato: '' }));
  return senzaData(normalizza(file)) === senzaData(dati);
}

/* File e telefono hanno dati diversi: il pannello chiede quale versione tenere.
   origine: 'nuova' = cartella appena scelta, 'riattiva' = cartella già collegata. */
function chiediVersione(h, file, origine) {
  const dati = normalizza(file);
  const piuRecente = String(dati.aggiornato || '') > String(S.dati.aggiornato || '') ? 'file' : 'locale';
  S.conflitto = { h, file: dati, origine, piuRecente, scelta: piuRecente };
  apriSheet();
}

/* Tiene la versione scelta e salva l'altra accanto al file, come copia di sicurezza. */
export async function confermaVersione() {
  const c = S.conflitto;
  if (!c) return;
  const tieniFile = c.scelta === 'file';
  const backup = nomeBackup(oggiISO());
  try {
    await scriviFile(c.h, serializza(tieniFile ? S.dati : c.file), backup);
    if (tieniFile) S.dati = c.file;
    S.dirHandle = c.h;
    S.permessoCartella = true;
    if (c.origine === 'nuova') await salvaHandle(c.h);
    chiudiSheet();
    await salva();
    render();
    toast((tieniFile ? 'Caricato ' + FILENAME + '. I dati del telefono sono in ' : 'Tenuti i dati del telefono. Il file di prima è in ') + backup + '.');
  } catch (e) {
    toast('Non è stato possibile scrivere nella cartella ' + c.h.name + '.');
  }
}

export async function scegliCartella() {
  try {
    const h = await chiediCartella();
    if (!h) return;
    const esistente = await leggiFile(h);
    if (esistente && Array.isArray(esistente.movimenti)) {
      if (!S.dati.movimenti.length) S.dati = normalizza(esistente);
      else if (!stessiDati(esistente, S.dati)) { chiediVersione(h, esistente, 'nuova'); return; }
    }
    S.dirHandle = h;
    S.permessoCartella = true;
    await salvaHandle(h);
    await salva();
    toast('Collegato: la cartella ' + h.name + ' ora contiene ' + FILENAME + '.');
    render();
  } catch (e) {
    if (e && e.name !== 'AbortError') toast('Non è stato possibile aprire la cartella.');
  }
}

/* All'avvio: prima localStorage, poi il file se il permesso sulla cartella è ancora valido
   (vince il più recente). Senza permesso la cartella resta collegata e il permesso
   viene richiesto al primo salvataggio. */
export async function avvia() {
  try { S.bannerNascosto = localStorage.getItem(LS_BANNER) === '1'; } catch (e) {}
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      S.dati = normalizza(JSON.parse(raw));
      ultimoSalvato = String(S.dati.aggiornato || '');
      S.salvato = 'solo su questo telefono';
    }
  } catch (e) {}

  if (supportaFS) {
    try {
      const h = await leggiHandle();
      if (h) {
        S.dirHandle = h;
        if (await permessoAttivo(h)) {
          S.permessoCartella = true;
          const dal = await leggiFile(h);
          if (dal && !(ultimoSalvato > String(dal.aggiornato || ''))) {
            S.dati = normalizza(dal);
            ultimoSalvato = String(S.dati.aggiornato || '');
            S.salvato = 'dal file';
          } else if (ultimoSalvato) {
            await salva(); // i dati di questo dispositivo sono più recenti del file
          }
        } else {
          S.salvato = 'permesso da riattivare';
        }
      }
    } catch (e) {}
  }
  render();
}
