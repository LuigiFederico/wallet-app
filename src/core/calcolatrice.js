/* Calcolatrice del form "nuovo movimento": il calcolo è una stringa come si vede ('12,5+8×2'),
   con la virgola decimale e i simboli + − × ÷. Precedenza normale, niente parentesi. */

const OPERATORI = '+−×÷';
const MAX_CIFRE = 7; // cifre intere di ogni numero
export const MAX_IMPORTO = 9999999.99;

function ultimoNumero(calcolo) {
  const m = calcolo.match(/[\d,]*$/);
  return m ? m[0] : '';
}

/* Il calcolo dopo la pressione di un tasto: cifra, ',', operatore o '⌫'. I tasti che non hanno senso lì vengono ignorati. */
export function premi(calcolo, tasto) {
  const c = String(calcolo || '');
  const ultimo = c.slice(-1);
  const num = ultimoNumero(c);
  if (tasto === '⌫') return c.slice(0, -1);
  if (/^\d$/.test(tasto)) {
    if (num.includes(',')) return num.split(',')[1].length >= 2 ? c : c + tasto;
    if (num === '0') return c.slice(0, -1) + tasto;
    return num.length >= MAX_CIFRE ? c : c + tasto;
  }
  if (tasto === ',') {
    if (num.includes(',')) return c;
    return c + (num === '' ? '0,' : ',');
  }
  if (OPERATORI.includes(tasto)) {
    if (c === '') return c;
    if (OPERATORI.includes(ultimo)) return c.slice(0, -1) + tasto;
    return (ultimo === ',' ? c.slice(0, -1) : c) + tasto;
  }
  return c;
}

export function haOperazioni(calcolo) {
  return /[+−×÷]./.test(String(calcolo || ''));
}

/* Arrotonda al centesimo passando dalla notazione decimale, così 1,005 (in binario 1,00499…) diventa 1,01.
   Sotto il millesimo è 0; i valori enormi restano come sono e vengono scartati da importoDaCalcolo. */
function centesimi(n) {
  if (Math.abs(n) < 0.001) return 0;
  if (Math.abs(n) >= 1e11) return n;
  return Math.round(Number(n.toPrecision(12) + 'e2')) / 100;
}

/* Risultato arrotondato al centesimo; un operatore in fondo non conta. NaN se vuoto o diviso per zero. */
export function calcola(calcolo) {
  const c = String(calcolo || '').replace(/[+−×÷,]+$/, '');
  if (c === '') return NaN;
  const pezzi = c.split(/([+−×÷])/);
  // prima × e ÷, poi + e −
  const somme = [parseFloat(pezzi[0].replace(',', '.'))];
  const segni = [];
  for (let i = 1; i < pezzi.length; i += 2) {
    const op = pezzi[i], n = parseFloat(pezzi[i + 1].replace(',', '.'));
    if (op === '×') somme[somme.length - 1] *= n;
    else if (op === '÷') {
      if (n === 0) return NaN;
      somme[somme.length - 1] /= n;
    } else { segni.push(op); somme.push(n); }
  }
  const tot = somme.reduce((acc, n, i) => (i === 0 ? n : segni[i - 1] === '+' ? acc + n : acc - n), 0);
  return centesimi(tot);
}

/* L'importo da salvare nella bozza, nel formato che parseImporto legge ('20,50');
   '' se il risultato non è valido (zero, negativo, diviso per zero, oltre MAX_IMPORTO). */
export function importoDaCalcolo(calcolo) {
  const n = calcola(calcolo);
  return n > 0 && n <= MAX_IMPORTO ? n.toFixed(2).replace('.', ',') : '';
}
