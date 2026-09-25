/* Statistiche: indicatori, uscite per categoria, andamento annuale, budget. */

import { S } from '../../state.js';
import { esc, eur, eurSegno, chiaveMese, percentuale } from '../../core/formato.js';
import { MESI, SIGLE } from '../../core/costanti.js';
import { delMese, dellAnno, totale, riepilogo, righeBudget, daRimborsare } from '../../core/calcoli.js';
import { ciambella } from '../componenti.js';

function tile(etichetta, valore, classe) {
  return '<div class="card tile"><div class="lbl">' + etichetta + '</div><div class="num tile-val' + (classe ? ' ' + classe : '') + '">' + valore + '</div></div>';
}

function indicatori(r, daRimb) {
  return '<div class="tiles">'
    + '<div class="tiles-riga">'
    + '<div class="tile tile--scuro"><div class="lbl">Entrate − Uscite</div><div class="num tile-val">' + eurSegno(r.entrate - r.uscite) + '</div></div>'
    + tile('% salvata', percentuale(r.entrate - r.uscite, r.entrate), 'is-accento')
    + '</div><div class="tiles-riga">'
    + tile('Uscite / Entrate', percentuale(r.uscite, r.entrate))
    + tile('Da rimborsare', eur(daRimb), 'is-oro')
    + '</div></div>';
}

function perCategoria(r, tot) {
  return '<div class="h2 titolo-primo">Dove sono finiti i soldi</div>'
    + '<div class="card torta">'
    + ciambella(r.ordinate, tot, 'Speso', eur(r.uscite), 'lg')
    + '<div class="torta-legenda">'
    + (r.ordinate.length ? r.ordinate.map((c) =>
        '<div class="torta-riga">'
        + '<i class="quadratino" style="background:' + c.colore + '"></i>'
        + '<div class="ell torta-nome">' + esc(c.nome) + '</div>'
        + '<div class="num torta-val">' + eur(c.val) + '</div>'
        + '<div class="num torta-pct">' + percentuale(c.val, tot) + '</div></div>').join('')
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

function spesoVsPrevisto(catTot) {
  const tutte = righeBudget(S.dati, S.mese, catTot);
  const rischio = tutte.filter((b) => b.bud && b.speso >= b.bud * 0.8);
  const mostra = S.tutteCategorie ? tutte : (rischio.length ? rischio : tutte.slice(0, 5));

  return '<div class="h2 titolo-sez">Speso vs previsto</div>'
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
    + indicatori(r, daRimborsare(movs))
    + perCategoria(r, r.tot || 1)
    + andamentoAnnuale(anno)
    + spesoVsPrevisto(r.catTot);
}
