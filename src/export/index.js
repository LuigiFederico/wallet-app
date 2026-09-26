/* Download dei file di export dal browser. */

import { S } from '../state.js';
import { FILENAME } from '../core/costanti.js';
import { serializza } from '../persistenza.js';
import { toast } from '../ui/toast.js';
import { csv } from './csv.js';
import { xlsx } from './xlsx.js';

function scarica(blob, nome) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Esportato ' + nome);
}

export function exportJson() {
  scarica(new Blob([serializza(S.dati)], { type: 'application/json' }), FILENAME);
}

export function exportCsv() {
  scarica(new Blob([csv(S.dati.movimenti)], { type: 'text/csv;charset=utf-8' }), 'movimenti.csv');
}

export function exportXlsx() {
  const { nome, blob } = xlsx(S.dati);
  scarica(blob, nome);
}
