/* Modifiche ai dati: ognuna salva e ridisegna. Quelle distruttive si possono annullare dal toast. */

import { S } from './state.js';
import { DA_RIMBORSARE } from './core/costanti.js';
import { normalizza, nuovoId } from './core/dati.js';
import { eur, oggiISO, parseImporto, spostaChiaveMese } from './core/formato.js';
import { salva } from './persistenza.js';
import { render } from './ui/render.js';
import { toast, nascondiToast } from './ui/toast.js';

function snapshot() { S.annullaSnapshot = JSON.stringify(S.dati); }

function annullaUltima() {
  if (!S.annullaSnapshot) return;
  S.dati = JSON.parse(S.annullaSnapshot);
  S.annullaSnapshot = null;
  nascondiToast();
  salva(); render();
}

export function aggiungi(mv) {
  snapshot();
  S.dati.movimenti.unshift(mv);
  S.mese = mv.data.slice(0, 7);
  salva(); render();
  toast((mv.tipo === 'uscita' ? 'Uscita' : 'Entrata') + ' di ' + eur(mv.importo) + ' salvata.', annullaUltima);
}

export function elimina(id) {
  snapshot();
  S.dati.movimenti = S.dati.movimenti.filter((m) => m.id !== id);
  S.dettaglio = null;
  salva(); render();
  toast('Movimento eliminato.', annullaUltima);
}

export function duplica(mv) {
  const copia = Object.assign({}, mv, { id: nuovoId(), data: oggiISO() });
  S.dettaglio = null;
  aggiungi(copia);
}

export function toggleRimborso(id) {
  const m = S.dati.movimenti.find((x) => x.id === id);
  if (!m) return;
  m.rimborsato = !m.rimborsato;
  S.dettaglio = m;
  salva(); render();
}

export function setBudget(nome, val) {
  if (!S.dati.budget[S.mese]) S.dati.budget[S.mese] = {};
  S.dati.budget[S.mese][nome] = Math.max(0, parseImporto(val) || 0);
  salva();
}

export function toggleEsclusione(nome) {
  const e = S.dati.escludiDaPortafoglio;
  ['uscite', 'entrate'].forEach((k) => {
    if (k === 'entrate' && nome === DA_RIMBORSARE) return;
    const i = (e[k] || []).indexOf(nome);
    if (i >= 0) e[k].splice(i, 1); else e[k].push(nome);
  });
  salva(); render();
}

export function spostaMese(delta) {
  S.mese = spostaChiaveMese(S.mese, delta);
  render();
}

export async function importaJson(file) {
  try {
    const d = normalizza(JSON.parse(await file.text()));
    if (!confirm('Sostituisco i dati attuali con ' + d.movimenti.length + ' movimenti dal file?')) return;
    snapshot();
    S.dati = d;
    salva(); render();
    toast('Importati ' + d.movimenti.length + ' movimenti.', annullaUltima);
  } catch (e) { toast('File non valido.'); }
}
