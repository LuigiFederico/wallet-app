/* Forma del documento wallet-data.json (vedi README) e costruzione dei movimenti. */

import { CAT_USCITE, CAT_ENTRATE, BUONI_PASTO, DA_RIMBORSARE, INVESTIMENTI, FILENAME } from './costanti.js';
import { oggiISO, parseImporto } from './formato.js';

export function datiVuoti() {
  return {
    versione: 1,
    valuta: 'EUR',
    aggiornato: new Date().toISOString(),
    escludiDaPortafoglio: { uscite: [BUONI_PASTO, DA_RIMBORSARE, INVESTIMENTI], entrate: [BUONI_PASTO, INVESTIMENTI] },
    categorie: {
      uscite: CAT_USCITE.map(([nome, colore]) => ({ nome, colore })),
      entrate: CAT_ENTRATE.map(([nome, colore]) => ({ nome, colore }))
    },
    budget: {},
    movimenti: []
  };
}

/* Completa un documento letto da file/localStorage con i campi mancanti. */
export function normalizza(d) {
  const base = datiVuoti();
  const out = Object.assign(datiVuoti(), d || {});
  out.categorie = out.categorie && out.categorie.uscite ? out.categorie : base.categorie;
  out.escludiDaPortafoglio = out.escludiDaPortafoglio || base.escludiDaPortafoglio;
  out.budget = out.budget || {};
  out.movimenti = Array.isArray(out.movimenti) ? out.movimenti : [];
  return out;
}

/* Copia di sicurezza accanto al file: 'wallet-data.backup-2026-09-25.json' */
export function nomeBackup(giorno) {
  return FILENAME.replace(/\.json$/, '.backup-' + giorno + '.json');
}

export function nuovoId() {
  return 'm' + Date.now();
}

/* Bozza del form "aggiungi": ha categoria e importo > 0? */
export function bozzaPronta(b) {
  return !!b.categoria && parseImporto(b.importo) > 0;
}

/* Bozza del form "modifica" a partire da un movimento salvato. */
export function bozzaDaMovimento(m) {
  return {
    id: m.id, tipo: m.tipo, data: m.data, importo: String(m.importo).replace('.', ','),
    categoria: m.categoria, descrizione: m.descrizione === m.categoria ? '' : (m.descrizione || '')
  };
}

/* Movimento da salvare a partire dalla bozza del form. */
export function movimentoDaBozza(b) {
  return {
    id: nuovoId(), tipo: b.tipo, data: b.data || oggiISO(),
    importo: Math.round(parseImporto(b.importo) * 100) / 100, categoria: b.categoria,
    descrizione: b.descrizione || b.categoria,
    ...(b.categoria === DA_RIMBORSARE ? { rimborsato: false } : {})
  };
}
