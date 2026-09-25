/* Butterflies in the wallet — PWA
   Dati in wallet-data.json, scritto direttamente nella cartella scelta
   tramite File System Access API (Chrome Android / desktop).
   Fallback: localStorage + export manuale. */

import './styles/index.css';
import { collegaEventi } from './ui/eventi.js';
import { avvia } from './persistenza.js';

collegaEventi();
avvia();

// in sviluppo niente service worker: servirebbe file vecchi dalla cache
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
