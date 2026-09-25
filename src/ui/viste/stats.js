/* Statistiche: indicatori, uscite per categoria, andamento annuale, budget. */

import { S } from '../../state.js';
import { esc, eur, eurSegno, chiaveMese, percentuale, indiceMese, meseInFrase } from '../../core/formato.js';
import { MESI, SIGLE, COLORE_FUORI } from '../../core/costanti.js';
import {
  delMese, dellAnno, totale, riepilogo, righeBudget, righeConBudget, budgetDi, totaleBudget, meseBudgetPrecedente, daRimborsare
} from '../../core/calcoli.js';
import { ciambella, fetteUscite, testataSezione } from '../componenti.js';

function tile(etichetta, valore, classe) {
  return '<div class="card tile"><div class="lbl">' + etichetta + '</div><div class="num tile-val' + (classe ? ' ' + classe : '') + '">' + valore + '</div></div>';
}

function indicatori(r, daRimb) {
  return '<div class="tiles">'
    + '<div class="tiles-riga">'
    + '<div class="tile tile--scuro"><div class="lbl">Entrate − Uscite</div><div class="num tile-val">' + eurSegno(r.entrate - r.uscite) + '</div></div>'
    + tile('% risparmiata', percentuale(r.entrate - r.uscite, r.entrate), 'is-accento')
    + '</div><div class="tiles-riga">'
    + tile('Uscite / Entrate', percentuale(r.uscite, r.entrate))
    + tile('Da rimborsare', eur(daRimb), 'is-oro')
    + '</div></div>';
}

function rigaTorta(nome, colore, val, pct, fuori) {
  return '<div class="torta-riga' + (fuori ? ' is-fuori' : '') + '">'
    + '<i class="quadratino' + (fuori ? ' dot--fuori' : '') + '" style="background:' + colore + '"></i>'
    + '<div class="ell torta-nome">' + esc(nome) + '</div>'
    + '<div class="num torta-val">' + eur(val) + '</div>'
    + '<div class="num torta-pct">' + pct + '</div></div>';
}

/* come in Casa: il centro e le percentuali sono del portafoglio, le escluse restano in grigio a parte */
function perCategoria(r, tot) {
  return '<div class="h2 titolo-primo">Dove sono finiti i soldi</div>'
    + '<div class="card torta">'
    + ciambella(fetteUscite(r), tot, 'Uscite<br>portafoglio', eur(r.uscite), 'lg')
    + '<div class="torta-legenda">'
    + (r.ordinate.length
        ? r.portafoglio.map((c) => rigaTorta(c.nome, c.colore, c.val, percentuale(c.val, r.uscite))).join('')
          + (r.fuori.length
              ? '<div class="lbl torta-fuori">Fuori dal totale</div>' + r.fuori.map((c) => rigaTorta(c.nome, COLORE_FUORI, c.val, '', true)).join('')
              : '')
        : '<div class="vuoto-breve">Ancora nessuna uscita.</div>')
    + '</div></div>';
}

function andamentoAnnuale(anno) {
  const mesi = MESI.map((_, i) => {
    const k = chiaveMese(anno, i);
    const mm = delMese(S.dati.movimenti, k);
    return { k, sigla: SIGLE[i], inn: totale(S.dati, mm, 'entrata', true), out: totale(S.dati, mm, 'uscita', true) };
  });
  const max = Math.max(1, ...mesi.map((m) => Math.max(m.inn, m.out)));
  const altezza = (v) => ((v / max) * 100).toFixed(1) + '%';

  return '<div class="h2 titolo-sez">Entrate e uscite, mese per mese</div>'
    + '<div class="card grafico">'
    + '<div class="grafico-barre">'
    + mesi.map((m) => '<button class="grafico-mese" data-mese="' + m.k + '">'
        + '<div class="grafico-colonne">'
        + '<i class="grafico-in" style="height:' + altezza(m.inn) + '"></i>'
        + '<i class="grafico-out" style="height:' + altezza(m.out) + '"></i></div>'
        + '<div class="grafico-sigla" data-on="' + (m.k === S.mese ? 1 : 0) + '">' + m.sigla + '</div></button>').join('')
    + '</div>'
    + '<div class="grafico-legenda">'
    + '<div class="grafico-voce"><i class="grafico-in"></i>Entrate</div>'
    + '<div class="grafico-voce"><i class="grafico-out"></i>Uscite</div>'
    + '<div class="grafico-nota">solo portafoglio</div></div></div>';
}

function rigaBudget(b) {
  const stato = !b.bud ? '' : b.diff >= 0 ? ' is-verde' : ' is-rosso';
  return '<div><div class="budget-testa">'
    + '<div class="ell budget-nome">' + esc(b.nome) + '</div>'
    + '<div class="num budget-speso">' + eur(b.speso) + '</div>'
    + '<div class="num budget-resto' + stato + '">'
    + (b.bud ? (b.diff >= 0 ? 'resta ' + eur(b.diff) : '+' + eur(-b.diff)) : '—') + '</div></div>'
    + '<div class="bar bar--alta"><i style="width:' + b.w + ';background:' + b.barColore + '"></i></div></div>';
}

function categorie(n) {
  return n + (n === 1 ? ' categoria' : ' categorie');
}

/* mese senza budget: anteprima del mese precedente che ne ha uno, da copiare con un tocco */
function proponiCopia(da, catTot) {
  const bm = S.dati.budget[da], t = totaleBudget(bm);
  const anteprima = righeConBudget(S.dati, bm, catTot).filter((b) => b.bud > 0);
  const nomeDa = meseInFrase(da, S.mese), qui = MESI[indiceMese(S.mese)];
  return '<div class="card copia-budget">'
    + '<div><div class="copia-titolo">' + qui + ' non ha ancora un budget</div>'
    + '<div class="copia-testo">' + (nomeDa[0] === 'a' ? 'Ad ' : 'A ') + nomeDa + ' avevi ' + categorie(t.categorie) + ', per un totale di ' + eur(t.totale)
    + '. Ecco come sarebbe ' + qui.toLowerCase() + ':</div></div>'
    + '<div class="copia-anteprima budget-lista">' + anteprima.slice(0, 3).map(rigaBudget).join('')
    + (anteprima.length > 4 ? '<div class="copia-altre">+ altre ' + categorie(anteprima.length - 3) + '</div>'
      : anteprima.length === 4 ? '<div class="copia-altre">+ un\'altra categoria</div>' : '') + '</div>'
    + '<div class="copia-azioni"><button class="cta" data-bud-copia="' + da + '">Copia da ' + nomeDa + '</button>'
    + '<button class="btn-tenue" data-go="impostazioni">Imposta a mano</button></div></div>';
}

function spesoVsPrevisto(catTot, perAnno) {
  const testa = testataSezione('Speso vs previsto', 'impostazioni', 'Modifica budget', 'sez-testa--budget');
  const vuoto = !totaleBudget(budgetDi(S.dati, S.mese)).categorie;
  const da = !perAnno && vuoto && meseBudgetPrecedente(S.dati, S.mese);
  if (da) return testa + proponiCopia(da, catTot);

  // nella vista Anno il budget è la somma dei budget impostati mese per mese
  const tutte = righeBudget(S.dati, perAnno ? S.mese.slice(0, 4) : S.mese, catTot);
  const rischio = tutte.filter((b) => b.bud && b.speso >= b.bud * 0.8);
  const mostra = S.tutteCategorie ? tutte : (rischio.length ? rischio : tutte.slice(0, 5));

  return testa
    + (perAnno ? '<div class="nota">Budget dell\'anno: la somma dei budget impostati mese per mese.</div>' : '')
    + (S.tutteCategorie || !rischio.length ? '' : '<div class="nota">Solo le categorie oltre l\'80% del budget.</div>')
    + '<div class="budget-lista budget-lista--larga">' + mostra.map(rigaBudget).join('') + '</div>'
    + '<button id="toggleTutte" class="btn-bordo">'
    + (S.tutteCategorie ? 'Mostra solo quelle a rischio' : 'Mostra tutte le ' + tutte.length + ' categorie') + '</button>';
}

export function vistaStats() {
  const anno = S.mese.slice(0, 4);
  const perAnno = S.vista === 'anno';
  const movs = perAnno ? dellAnno(S.dati.movimenti, anno) : delMese(S.dati.movimenti, S.mese);
  const r = riepilogo(S.dati, movs);

  return '<div class="seg">'
    + '<button data-vista="mese" data-on="' + (S.vista === 'mese' ? 1 : 0) + '">Mese</button>'
    + '<button data-vista="anno" data-on="' + (perAnno ? 1 : 0) + '">Anno ' + anno + '</button></div>'
    + indicatori(r, daRimborsare(S.dati, movs))
    + perCategoria(r, r.tot || 1)
    + andamentoAnnuale(anno)
    + spesoVsPrevisto(r.catTot, perAnno);
}
