/* Casa: quanto hai speso nel mese a confronto con i mesi prima, i conti del mese, entrate e uscite per categoria. */

import { S } from '../../state.js';
import { esc, eur, eurSegno, oggiISO, indiceMese, percentuale, periodoMedia } from '../../core/formato.js';
import { MESI, COLORE_FUORI } from '../../core/costanti.js';
import { delMese, riepilogo, cumulata, spesaDiSolito, entratePerCategoria } from '../../core/calcoli.js';
import { supportaFS } from '../../storage/file.js';

const ICONA_CARTELLA = '<svg width="18" height="16" viewBox="0 0 20 17" fill="none"><path d="M1.5 3.2c0-.9.7-1.7 1.7-1.7h4.2l2 2.2h7.4c.9 0 1.7.8 1.7 1.7v8.9c0 .9-.8 1.7-1.7 1.7H3.2c-1 0-1.7-.8-1.7-1.7V3.2Z" stroke="#5856D6" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const ICONA_AVANTI = '<svg width="7" height="12" viewBox="0 0 8 13" fill="none"><path d="M1.5 1L6.5 6.5L1.5 12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

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

function kpi(etichetta, valore, variante) {
  return '<div class="kpi"><div class="lbl">' + etichetta + '</div><div class="num kpi-val' + (variante ? ' ' + variante : '') + '">' + valore + '</div></div>';
}

/* grafico della spesa cumulata: il mese fino al giorno `g` (linea piena) e il "di solito" (tratteggio) */
const W = 318, H = 130;
function grafico(mese, solito, g) {
  const n = mese.length;
  const max = Math.max(1, g ? mese[g - 1] : 0, solito ? solito[n - 1] : 0);
  const x = (i) => (n > 1 ? (i / (n - 1)) * W : 0).toFixed(1);
  const y = (v) => (H - 3 - (v / max) * (H - 9)).toFixed(1);
  const punti = (serie) => serie.map((v, i) => x(i) + ',' + y(v)).join(' ');
  let svg = '<svg class="ritmo-grafico" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
  if (solito) svg += '<polyline class="ritmo-solito" points="' + punti(solito) + '"/>';
  if (g) {
    const s = mese.slice(0, g);
    svg += '<path class="ritmo-area" d="M0,' + H + ' L' + punti(s).split(' ').join(' L') + ' L' + x(g - 1) + ',' + H + 'Z"/>'
      + '<polyline class="ritmo-linea" points="' + punti(s) + '"/>'
      + '<circle class="ritmo-punto" cx="' + x(g - 1) + '" cy="' + y(s[g - 1]) + '" r="4.5"/>';
  }
  return svg + '</svg>';
}

/* giorno (1…n) dell'ultima uscita del mese, 0 se non ce ne sono */
function ultimoGiornoConSpesa(cumulata) {
  for (let i = cumulata.length - 1; i >= 0; i--) if (cumulata[i] > (i ? cumulata[i - 1] : 0)) return i + 1;
  return 0;
}

/* le cifre del "di solito": nel mese in corso fino al giorno della linea e a fine mese; in un mese chiuso
   il totale e la differenza; in un mese futuro solo il totale, perché il mese non è ancora andato */
function fatti(solito, g, n, speso, stato) {
  if (!solito) return '<div class="ritmo-nota">Il confronto con i mesi prima parte dal mese prossimo.</div>';
  const fine = solito.giorni[n - 1];
  return '<div class="kpi-riga">'
    + (stato === 'corrente'
        ? kpi('Di solito al giorno ' + g, eur(solito.giorni[g - 1])) + kpi('Di solito a fine mese', eur(fine))
        : kpi('Di solito in un mese', eur(fine)) + (stato === 'chiuso' ? kpi('Differenza', eurSegno(speso - fine)) : ''))
    + '</div>';
}

function rigaLegenda(nome, colore, valore, fuori) {
  return '<div class="legenda-riga' + (fuori ? ' is-fuori' : '') + '">'
    + '<i class="dot' + (fuori ? ' dot--fuori' : '') + '" style="background:' + colore + '"></i>'
    + '<div class="ell legenda-nome">' + esc(nome) + '</div>'
    + '<div class="num legenda-pct">' + valore + '</div></div>';
}

/* ciambella in SVG: un arco per categoria, separati da un piccolo stacco (più corto sulle fette
   minime, che restano visibili), dalle 12 in senso orario; il nome al centro */
function torta(f, tot, nome) {
  const R = 50, C = 2 * Math.PI * R;
  let acc = 0;
  const archi = f.map((c) => {
    const lungo = (c.val / tot) * C;
    const arco = '<circle cx="64" cy="64" r="' + R + '" stroke="' + c.colore + '" stroke-dasharray="'
      + (f.length > 1 ? lungo - Math.min(2, lungo * 0.4) : lungo).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '"/>';
    acc += lungo;
    return arco;
  }).join('');
  return '<svg class="torta-casa" viewBox="0 0 128 128" aria-hidden="true"><g transform="rotate(-90 64 64)">'
    + '<circle class="torta-casa-binario" cx="64" cy="64" r="' + R + '"/>' + archi + '</g>'
    + '<text class="torta-casa-nome" x="64" y="64">' + nome + '</text></svg>';
}

/* legenda: uscite ed entrate in percentuale sul loro totale; le uscite escluse a parte, in euro */
function legenda(r, ent) {
  return (r.portafoglio.length ? '<div class="lbl legenda-gruppo">Uscite</div>'
      + r.portafoglio.map((x) => rigaLegenda(x.nome, x.colore, percentuale(x.val, r.uscite))).join('') : '')
    + (ent.length ? '<div class="lbl legenda-gruppo">Entrate</div>'
      + ent.map((x) => rigaLegenda(x.nome, x.colore, percentuale(x.val, r.entrate))).join('') : '')
    + (r.fuori.length
        ? '<div class="lbl legenda-fuori">Uscite fuori dal totale</div>' + r.fuori.map((x) => rigaLegenda(x.nome, COLORE_FUORI, eur(x.val), true)).join('')
        : '');
}

/* entrate e uscite per categoria: due ciambelle affiancate e la legenda; i totali sono già sopra */
function dove(r) {
  const ent = entratePerCategoria(S.dati, r.movs);
  if (!r.ordinate.length && !ent.length) return '';
  return '<div class="card dove">'
    + '<button class="dove-testa" data-go="stats" data-go-vista="mese"><span class="lbl">Entrate e uscite</span><span class="riga-freccia">' + ICONA_AVANTI + '</span></button>'
    + '<div class="torte">' + torta(r.portafoglio, r.uscite || 1, 'Uscite') + torta(ent, r.entrate || 1, 'Entrate') + '</div>'
    + '<div class="legenda">' + legenda(r, ent) + '</div>'
    + '</div>';
}

export function vistaCasa() {
  const r = riepilogo(S.dati, delMese(S.dati.movimenti, S.mese));
  const mese = cumulata(S.dati, S.mese), n = mese.length;
  const oggi = oggiISO(), meseOggi = oggi.slice(0, 7);
  const stato = S.mese === meseOggi ? 'corrente' : S.mese < meseOggi ? 'chiuso' : 'futuro';
  // nel mese in corso la linea arriva a oggi, o all'ultima uscita già inserita con una data più avanti
  const g = stato === 'chiuso' ? n : stato === 'futuro' ? 0 : Math.max(parseInt(oggi.slice(8), 10), ultimoGiornoConSpesa(mese));
  const solito = spesaDiSolito(S.dati, S.mese, meseOggi);
  const nome = MESI[indiceMese(S.mese)].toLowerCase(), breve = nome.slice(0, 3);

  return bannerCartella()
    + '<div class="card ritmo">'
    + '<div class="lbl">Speso ' + (nome[0] === 'a' ? 'ad ' : 'a ') + nome + '</div>'
    + '<div class="num ritmo-val">' + eur(r.uscite) + '</div>'
    + grafico(mese, solito && solito.giorni, g)
    + '<div class="ritmo-asse"><span>1 ' + breve + '</span>'
    + (solito ? '<span><i class="tratteggio"></i>di solito: ' + (solito.mesi === 1 ? 'il mese scorso' : 'mediana ' + periodoMedia(solito.mesi)) + '</span>' : '')
    + '<span>' + n + ' ' + breve + '</span></div>'
    + (r.movs.length ? fatti(solito, g, n, r.uscite, stato)
        : '<div class="ritmo-nota">Nessun movimento in ' + nome + '. Tocca + per la prima voce.</div>')
    + '</div>'

    + '<div class="card conti"><div class="kpi-riga">'
    + kpi('Rimasto', eur(r.rimasto), '')
    + kpi('Entrate', eur(r.entrate), 'is-verde')
    + kpi('Risparmio', percentuale(r.rimasto, r.entrate), 'is-accento')
    + '</div></div>'

    + dove(r);
}
