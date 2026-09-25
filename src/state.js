/* Stato dell'app: i dati persistiti più lo stato dell'interfaccia. */

import { datiVuoti } from './core/dati.js';
import { oggiISO } from './core/formato.js';

export const S = {
  dati: datiVuoti(),

  // navigazione
  tab: 'casa',
  ultimoTab: null,
  mese: oggiISO().slice(0, 7),

  // filtri delle viste
  vista: 'mese',          // statistiche: 'mese' | 'anno'
  filtro: 'Tutti',        // storico
  query: '',              // storico
  tutteCategorie: false,  // statistiche: mostra tutte le righe budget

  // salvataggio
  dirHandle: null,
  permessoCartella: false, // readwrite concesso sulla cartella in questa sessione
  salvato: 'mai',
  scrivo: false,

  // sheet aperti
  bozza: null,            // form "aggiungi"
  dettaglio: null,        // movimento selezionato

  annullaSnapshot: null
};
