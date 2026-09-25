/* CSV per Excel italiano: separatore ';', virgola decimale, BOM UTF-8. */

export function csv(movimenti) {
  const righe = [['Data','Tipo','Importo','Categoria','Descrizione','Rimborsato']];
  movimenti.slice().sort((a, b) => (a.data < b.data ? -1 : 1))
    .forEach((m) => righe.push([m.data, m.tipo, String(m.importo).replace('.', ','), m.categoria, m.descrizione || '', m.rimborsato ? 'sì' : '']));
  return '﻿' + righe.map((r) => r.join(';')).join('\r\n');
}
