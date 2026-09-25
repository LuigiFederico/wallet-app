/* Casa: riepilogo del mese, budget più usati, ultimi movimenti. */

import { S } from '../../state.js';
import { esc, eur, oggiISO, giorniNelMese, indiceMese, percentuale } from '../../core/formato.js';
import { MESI, COLORE_FUORI } from '../../core/costanti.js';
import { delMese, riepilogo, righeBudget } from '../../core/calcoli.js';
import { supportaFS } from '../../storage/file.js';
import { ciambella, fetteUscite, rigaMovimento, testataSezione } from '../componenti.js';

const ICONA_CARTELLA = '<svg width="18" height="16" viewBox="0 0 20 17" fill="none"><path d="M1.5 3.2c0-.9.7-1.7 1.7-1.7h4.2l2 2.2h7.4c.9 0 1.7.8 1.7 1.7v8.9c0 .9-.8 1.7-1.7 1.7H3.2c-1 0-1.7-.8-1.7-1.7V3.2Z" stroke="#5B4BC4" stroke-width="1.6" stroke-linejoin="round"/></svg>';

/* finché i dati sono solo nel browser, invito a collegare una cartella */
function bannerCartella() {
  if (!supportaFS || S.dirHandle || S.bannerNascosto) return '';
  return '<div class="card banner">'
    + '<div class="banner-testa"><div class="banner-icona">' + ICONA_CARTELLA + '</div>'
    + '<div><div class="banner-titolo">I tuoi dati sono solo in questo browser</div>'
    + '<div class="banner-testo">Collega una cartella, meglio se sincronizzata con Drive: avrai il file e un backup.</div></div></div>'
    + '<div class="banner-azioni"><button id="pickDir" class="banner-cta">Collega una cartella</button>'
    + '<button id="bannerNo" class="banner-no">Più tardi</button></div></div>';
}

function rigaLegenda(nome, colore, valore, fuori) {
  return '<div class="legenda-riga' + (fuori ? ' is-fuori' : '') + '">'
    + '<i class="dot' + (fuori ? ' dot--fuori' : '') + '" style="background:' + colore + '"></i>'
    + '<div class="ell legenda-nome">' + esc(nome) + '</div>'
    + '<div class="num legenda-pct">' + valore + '</div></div>';
}

/* percentuali sulle uscite del portafoglio (il numero al centro); le escluse a parte, in euro */
function legenda(r) {
  if (!r.ordinate.length) return '<div class="vuoto-breve">Nessuna uscita questo mese.</div>';
  return r.portafoglio.slice(0, r.fuori.length ? 4 : 5).map((x) => rigaLegenda(x.nome, x.colore, percentuale(x.val, r.uscite))).join('')
    + (r.fuori.length
        ? '<div class="lbl legenda-fuori">Fuori dal totale</div>' + r.fuori.map((x) => rigaLegenda(x.nome, COLORE_FUORI, eur(x.val), true)).join('')
        : '');
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

  return bannerCartella()
    + '<div class="card riepilogo">'
    + '<div class="riepilogo-top">'
    + ciambella(fetteUscite(r), r.tot || 1, 'Uscite<br>portafoglio', eur(r.uscite), 'sm')
    + '<div class="legenda">' + legenda(r) + '</div></div>'
    + '<div class="kpi-riga">'
    + kpi('Rimasto', eur(r.rimasto), '')
    + kpi('Entrate', eur(r.entrate), 'is-verde')
    + kpi('Risparmio', percentuale(r.rimasto, r.entrate), 'is-accento')
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
