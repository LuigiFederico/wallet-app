/* Forma del documento wallet-data.json (vedi README) e costruzione dei movimenti. */

import { CAT_USCITE, CAT_ENTRATE, BUONI_PASTO, DA_RIMBORSARE, INVESTIMENTI, FILENAME, RUOLI_PREDEFINITI, RUOLO_RIMBORSO } from './costanti.js';
import { oggiISO, parseImporto } from './formato.js';
import { categorie, haRuolo } from './calcoli.js';

function categoria(nome, colore) {
  return RUOLI_PREDEFINITI[nome] ? { nome, colore, ruolo: RUOLI_PREDEFINITI[nome] } : { nome, colore };
}

export function datiVuoti() {
  return {
    versione: 2,
    valuta: 'EUR',
    aggiornato: new Date().toISOString(),
    escludiDaPortafoglio: { uscite: [BUONI_PASTO, DA_RIMBORSARE, INVESTIMENTI], entrate: [BUONI_PASTO, INVESTIMENTI] },
    categorie: {
      uscite: CAT_USCITE.map(([nome, colore]) => categoria(nome, colore)),
      entrate: CAT_ENTRATE.map(([nome, colore]) => categoria(nome, colore))
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
  // versione 1: i ruoli non c'erano, il comportamento speciale dipendeva dal nome
  if (!(out.versione >= 2)) {
    [out.categorie.uscite, out.categorie.entrate || []].forEach((lista) => lista.forEach((c) => {
      if (!c.ruolo && RUOLI_PREDEFINITI[c.nome]) c.ruolo = RUOLI_PREDEFINITI[c.nome];
    }));
    out.versione = 2;
  }
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
export function movimentoDaBozza(dati, b) {
  return {
    id: nuovoId(), tipo: b.tipo, data: b.data || oggiISO(),
    importo: Math.round(parseImporto(b.importo) * 100) / 100, categoria: b.categoria,
    descrizione: b.descrizione || b.categoria,
    ...(haRuolo(dati, b, RUOLO_RIMBORSO) ? { rimborsato: false } : {})
  };
}

/* Gestione delle categorie (Impostazioni). Modificano `dati` sul posto; uscite ed entrate
   con lo stesso nome sono categorie diverse. */

function lista(dati, tipo) {
  return dati.categorie[tipo === 'entrata' ? 'entrate' : 'uscite'];
}
function esclusioni(dati, tipo) {
  return dati.escludiDaPortafoglio[tipo === 'entrata' ? 'entrate' : 'uscite'] || [];
}

/* Perché il nome non va bene ('' = va bene). `attuale` è il nome della categoria che si sta modificando. */
export function erroreNomeCategoria(dati, tipo, nome, attuale) {
  const n = String(nome).trim().toLowerCase();
  if (!n) return 'Scrivi un nome.';
  if (categorie(dati, tipo).some((c) => c.nome !== attuale && c.nome.toLowerCase() === n)) return 'C\'è già una categoria con questo nome.';
  return '';
}

export function aggiungiCategoria(dati, tipo, nome, colore) {
  lista(dati, tipo).push({ nome: nome.trim(), colore });
}

/* Nome e colore nuovi; il nome nuovo arriva a movimenti, budget ed esclusioni di quel tipo. */
export function modificaCategoria(dati, tipo, vecchio, nome, colore) {
  const c = lista(dati, tipo).find((x) => x.nome === vecchio);
  nome = nome.trim();
  c.nome = nome; c.colore = colore;
  if (nome === vecchio) return;
  dati.movimenti.forEach((m) => {
    if (m.tipo !== tipo || m.categoria !== vecchio) return;
    m.categoria = nome;
    if (m.descrizione === vecchio) m.descrizione = nome; // descrizione di default = nome della categoria
  });
  if (tipo === 'uscita') {
    Object.values(dati.budget).forEach((bm) => {
      if (vecchio in bm) { bm[nome] = bm[vecchio]; delete bm[vecchio]; }
    });
  }
  const ex = esclusioni(dati, tipo), i = ex.indexOf(vecchio);
  if (i >= 0) ex[i] = nome;
}

/* La categoria ha movimenti o budget che vanno spostati prima di eliminarla? */
export function usoCategoria(dati, tipo, nome) {
  const movimenti = dati.movimenti.filter((m) => m.tipo === tipo && m.categoria === nome).length;
  const budget = tipo === 'uscita' && Object.values(dati.budget).some((bm) => bm[nome] > 0);
  return { movimenti, budget };
}

/* Elimina una categoria: i suoi movimenti passano a `destinazione` e i suoi budget
   si sommano, mese per mese, a quelli della destinazione. Il suo ruolo si perde. */
export function eliminaCategoria(dati, tipo, nome, destinazione) {
  const k = tipo === 'entrata' ? 'entrate' : 'uscite';
  dati.categorie[k] = dati.categorie[k].filter((c) => c.nome !== nome);
  if (destinazione) {
    const rimborso = haRuolo(dati, { tipo, categoria: destinazione }, RUOLO_RIMBORSO);
    dati.movimenti.forEach((m) => {
      if (m.tipo !== tipo || m.categoria !== nome) return;
      m.categoria = destinazione;
      if (rimborso) m.rimborsato = false; else delete m.rimborsato;
    });
  }
  if (tipo === 'uscita') {
    Object.values(dati.budget).forEach((bm) => {
      if (!(nome in bm)) return;
      if (destinazione) bm[destinazione] = (bm[destinazione] || 0) + bm[nome];
      delete bm[nome];
    });
  }
  const ex = esclusioni(dati, tipo), i = ex.indexOf(nome);
  if (i >= 0) ex.splice(i, 1);
}
