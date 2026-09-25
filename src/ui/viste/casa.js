/* Casa: riepilogo del mese, budget più usati, ultimi movimenti. */

import { S } from '../../state.js';
import { esc, eur, oggiISO, giorniNelMese, indiceMese, percentuale } from '../../core/formato.js';
import { MESI } from '../../core/costanti.js';
import { delMese, riepilogo, righeBudget } from '../../core/calcoli.js';
import { ciambella, rigaMovimento, testataSezione } from '../componenti.js';

function legenda(r) {
  if (!r.ordinate.length) return '<div class="vuoto-breve">Nessuna uscita questo mese.</div>';
  return r.ordinate.slice(0, 5).map((x) =>
    '<div class="legenda-riga">'
    + '<i class="dot" style="background:' + x.colore + '"></i>'
    + '<div class="ell legenda-nome">' + esc(x.nome) + '</div>'
    + '<div class="num legenda-pct">' + percentuale(x.val, r.tot) + '</div></div>').join('');
}

function kpi(etichetta, valore, variante) {
  return '<div class="kpi"><div class="lbl">' + etichetta + '</div><div class="num kpi-val' + (variante ? ' ' + variante : '') + '">' + valore + '</div></div>';
}

function mini(etichetta, valore) {
  return '<div class="card mini"><div class="lbl">' + etichetta + '</div><div class="num mini-val">' + valore + '</div></div>';
}

function rigaBudget(b) {
  return '<div><div class="budget-testa">'
    + '<i class="dot dot--piccolo" style="background:' + b.colore + '"></i>'
    + '<div class="ell budget-nome">' + esc(b.nome) + '</div>'
    + '<div class="num budget-speso">' + eur(b.speso) + '</div>'
    + '<div class="num budget-tetto">/ ' + (b.bud ? eur(b.bud) : '—') + '</div></div>'
    + '<div class="bar"><i style="width:' + b.w + ';background:' + b.barColore + '"></i></div></div>';
}

export function vistaCasa() {
  const r = riepilogo(S.dati, delMese(S.dati.movimenti, S.mese));
  const gTot = giorniNelMese(S.mese);
  const gPass = S.mese === oggiISO().slice(0, 7) ? parseInt(oggiISO().slice(8), 10) : gTot;
  const media = r.uscite / Math.max(1, gPass);
  const budget = righeBudget(S.dati, S.mese, r.catTot).filter((b) => b.speso > 0).slice(0, 4);
  const recenti = r.movs.slice().sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 5);

  return '<div class="card riepilogo">'
    + '<div class="riepilogo-top">'
    + ciambella(r.ordinate, r.tot || 1, 'Uscite', eur(r.uscite), 'sm')
    + '<div class="legenda">' + legenda(r) + '</div></div>'
    + '<div class="kpi-riga">'
    + kpi('Rimasto', eur(r.rimasto), '')
    + kpi('Entrate', eur(r.entrate), 'is-verde')
    + kpi('Salvato', percentuale(r.rimasto, r.entrate), 'is-accento')
    + '</div></div>'

    + '<div class="mini-riga">' + mini('Al giorno', eur(media)) + mini('Stima fine mese', eur(media * gTot)) + '</div>'

    + (budget.length
        ? testataSezione('Budget del mese', 'stats', 'Tutte', 'sez-testa--budget')
          + '<div class="budget-lista">' + budget.map(rigaBudget).join('') + '</div>'
        : '')

    + testataSezione('Ultimi movimenti', 'storico', 'Storico', 'sez-testa--recenti')
    + (recenti.length
        ? '<div class="card lista">' + recenti.map(rigaMovimento).join('') + '</div>'
        : '<div class="vuoto">Nessun movimento in ' + MESI[indiceMese(S.mese)].toLowerCase() + '.<br>Tocca + per la prima voce.</div>');
}
