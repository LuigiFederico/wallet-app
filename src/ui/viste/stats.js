/* Statistiche: indicatori, uscite per categoria, andamento annuale, budget; vista Categoria. */

import { S } from '../../state.js';
import { esc, eur, eurSegno, chiaveMese, percentuale, indiceMese, meseInFrase, oggiISO, spostaChiaveMese } from '../../core/formato.js';
import { MESI, SIGLE, COLORE_FUORI } from '../../core/costanti.js';
import {
  delMese, dellAnno, totale, riepilogo, righeBudget, righeConBudget, budgetDi, totaleBudget, meseBudgetPrecedente, daRimborsare,
  categorie as categorieDi, uscitePerCategoria, andamentoCategoria
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

/* Vista Categoria: la categoria scelta, oppure l'uscita con più spesa in tutta la storia. */
function categoriaScelta() {
  const c = S.catStats;
  if (c && categorieDi(S.dati, c.tipo).some((x) => x.nome === c.nome)) return c;
  const catTot = uscitePerCategoria(S.dati.movimenti);
  const uscite = categorieDi(S.dati, 'uscita').slice().sort((a, b) => (catTot[b.nome] || 0) - (catTot[a.nome] || 0));
  return uscite.length ? { tipo: 'uscita', nome: uscite[0].nome } : { tipo: 'entrata', nome: categorieDi(S.dati, 'entrata')[0].nome };
}

const ICONA_GIU = '<svg class="select-freccia" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1.5 1.5 6 6l4.5-4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* value 'tipo:nome' */
function selettoreCategoria(scelta, coloreScelto) {
  const gruppo = (tipo, etichetta) => '<optgroup label="' + etichetta + '">'
    + categorieDi(S.dati, tipo).map((c) => {
        const on = scelta.tipo === tipo && scelta.nome === c.nome;
        return '<option value="' + tipo + ':' + esc(c.nome) + '"' + (on ? ' selected' : '') + '>' + esc(c.nome) + '</option>';
      }).join('') + '</optgroup>';
  return '<div class="select-box stat-cat"><i class="dot select-dot" style="background:' + coloreScelto + '"></i>'
    + '<select class="field field--select" id="statCat" aria-label="Categoria">'
    + gruppo('uscita', 'Uscite') + gruppo('entrata', 'Entrate') + '</select>' + ICONA_GIU + '</div>';
}

function sigla3(mese) {
  return MESI[indiceMese(mese)].slice(0, 3);
}

function indicatoriCategoria(a, uscita) {
  const prima = spostaChiaveMese(S.mese, -1);
  const pct = a.precedente ? '<div class="tile-sub">' + (a.delta >= 0 ? '+' : '−') + percentuale(Math.abs(a.delta), a.precedente) + '</div>' : '';
  const sforati = !a.conBudget ? '—' : !a.sforati ? 'mai' : a.sforati === 1 ? '1 mese' : a.sforati + ' mesi';
  return '<div class="tiles">'
    + '<div class="tiles-riga">' + tile('Totale', eur(a.totale)) + tile('Media mensile', eur(a.media)) + '</div>'
    + '<div class="tiles-riga">' + tile(sigla3(S.mese) + ' vs ' + sigla3(prima), eurSegno(a.delta) + pct)
    + (uscita ? tile('Budget superato', sforati) : '') + '</div></div>';
}

/* una barra per mese; la tacca è il budget del mese. Si scorre in orizzontale se i mesi sono tanti. */
function graficoCategoria(a, coloreCat, uscita) {
  const max = Math.max(1, ...a.mesi.map((m) => Math.max(m.val, m.bud)));
  const pct = (v) => ((v / max) * 100).toFixed(1) + '%';
  return '<div class="h2 titolo-sez">Mese per mese</div>'
    + '<div class="card grafico">'
    + '<div class="grafico-scorri"><div class="grafico-barre grafico-barre--cat">'
    + a.mesi.map((m, i) => '<button class="grafico-mese" data-mese="' + m.k + '">'
        + '<div class="grafico-colonne">'
        + '<i style="height:' + pct(m.val) + ';background:' + (m.bud && m.val > m.bud ? '#C0452B' : coloreCat) + '"></i>'
        + (m.bud ? '<b class="grafico-tacca" style="bottom:' + pct(m.bud) + '"></b>' : '') + '</div>'
        + '<div class="grafico-sigla" data-on="' + (m.k === S.mese ? 1 : 0) + '">' + SIGLE[indiceMese(m.k)] + '</div>'
        + '<div class="grafico-anno">' + (i === 0 || m.k.slice(5) === '01' ? m.k.slice(0, 4) : '') + '</div></button>').join('')
    + '</div></div>'
    + '<div class="grafico-legenda">'
    + '<div class="grafico-voce"><i style="background:' + coloreCat + '"></i>' + (uscita ? 'Speso' : 'Incassato') + '</div>'
    + (uscita ? '<div class="grafico-voce"><i class="grafico-tacca-voce"></i>Budget</div><div class="grafico-voce"><i class="grafico-oltre"></i>Oltre il budget</div>' : '')
    + '</div></div>';
}

function vistaCategoria() {
  const scelta = categoriaScelta(), uscita = scelta.tipo === 'uscita';
  const c = categorieDi(S.dati, scelta.tipo).find((x) => x.nome === scelta.nome);
  const a = andamentoCategoria(S.dati, scelta.tipo, scelta.nome, S.mese, oggiISO().slice(0, 7));
  return selettoreCategoria(scelta, c.colore)
    + indicatoriCategoria(a, uscita)
    + graficoCategoria(a, c.colore, uscita);
}

export function vistaStats() {
  const anno = S.mese.slice(0, 4);
  const perAnno = S.vista === 'anno';
  const seg = '<div class="seg">'
    + '<button data-vista="mese" data-on="' + (S.vista === 'mese' ? 1 : 0) + '">Mese</button>'
    + '<button data-vista="anno" data-on="' + (perAnno ? 1 : 0) + '">Anno ' + anno + '</button>'
    + '<button data-vista="categoria" data-on="' + (S.vista === 'categoria' ? 1 : 0) + '">Categoria</button></div>';
  if (S.vista === 'categoria') return seg + vistaCategoria();

  const movs = perAnno ? dellAnno(S.dati.movimenti, anno) : delMese(S.dati.movimenti, S.mese);
  const r = riepilogo(S.dati, movs);

  return seg
    + indicatori(r, daRimborsare(S.dati, movs))
    + perCategoria(r, r.tot || 1)
    + andamentoAnnuale(anno)
    + spesoVsPrevisto(r.catTot, perAnno);
}
