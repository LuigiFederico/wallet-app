/* Salvataggio dei dati: sempre in localStorage, e nel file se c'è una cartella collegata. */

import { S } from './state.js';
import { FILENAME, LS_KEY } from './core/costanti.js';
import { normalizza } from './core/dati.js';
import { supportaFS, chiediCartella, permessoAttivo, leggiFile, scriviFile } from './storage/file.js';
import { salvaHandle, leggiHandle } from './storage/handle-db.js';
import { render, aggiornaStatoSalvataggio } from './ui/render.js';
import { toast } from './ui/toast.js';

export function serializza(dati) {
  return JSON.stringify(dati, null, 1);
}

export async function salva() {
  S.dati.aggiornato = new Date().toISOString();
  const json = serializza(S.dati);
  try { localStorage.setItem(LS_KEY, json); } catch (e) {}
  if (!S.dirHandle) { S.salvato = 'solo su questo telefono'; return; }
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

export async function scegliCartella() {
  try {
    const h = await chiediCartella();
    if (!h) return;
    S.dirHandle = h;
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

/* All'avvio: prima localStorage, poi il file se il permesso sulla cartella è ancora valido. */
export async function avvia() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { S.dati = normalizza(JSON.parse(raw)); S.salvato = 'solo su questo telefono'; }
  } catch (e) {}

  if (supportaFS) {
    try {
      const h = await leggiHandle();
      if (h) {
        if (await permessoAttivo(h)) {
          S.dirHandle = h;
          const dal = await leggiFile(h);
          if (dal) { S.dati = normalizza(dal); S.salvato = 'dal file'; }
        } else {
          S.salvato = 'permesso da riattivare';
        }
      }
    } catch (e) {}
  }
  render();
}
