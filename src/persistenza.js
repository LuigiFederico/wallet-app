/* Salvataggio dei dati: sempre in localStorage, e nel file se c'è una cartella collegata. */

import { S } from './state.js';
import { FILENAME, LS_KEY } from './core/costanti.js';
import { normalizza } from './core/dati.js';
import { supportaFS, chiediCartella, permessoAttivo, riattivaPermesso, leggiFile, scriviFile } from './storage/file.js';
import { salvaHandle, leggiHandle } from './storage/handle-db.js';
import { render, aggiornaStatoSalvataggio } from './ui/render.js';
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
    toast('Scrittura non riuscita: ricollega la cartella dalle impostazioni.');
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
  // il file è più recente dei dati di prima di questa modifica: caricarlo la perde
  if (!confirm(FILENAME + ' in ' + S.dirHandle.name + ' è stato aggiornato da un altro dispositivo. Vuoi caricarlo? (Annulla = sovrascrivo con i dati di questo dispositivo, compresa l\'ultima modifica)')) return true;
  S.dati = normalizza(file);
  ultimoSalvato = String(S.dati.aggiornato || '');
  try { localStorage.setItem(LS_KEY, serializza(S.dati)); } catch (e) {}
  S.salvato = 'dal file';
  render();
  return false;
}

export async function scegliCartella() {
  try {
    const h = await chiediCartella();
    if (!h) return;
    S.dirHandle = h;
    S.permessoCartella = true;
    await salvaHandle(h);
    const esistente = await leggiFile(h);
    if (esistente && Array.isArray(esistente.movimenti)) {
      const n = esistente.movimenti.length;
      if (!S.dati.movimenti.length || confirm('Trovato ' + FILENAME + ' con ' + n + ' movimenti. Vuoi caricarlo? (Annulla = sovrascrivo con i dati attuali)')) {
        S.dati = normalizza(esistente);
      }
    }
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
