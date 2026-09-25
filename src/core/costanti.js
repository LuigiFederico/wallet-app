export const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
export const SIGLE = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];

export const FILENAME = 'wallet-data.json';
export const LS_KEY = 'butterflies-wallet-data';
export const LS_BANNER = 'butterflies-banner-cartella'; // '1' = banner "collega una cartella" chiuso

export const DA_RIMBORSARE = 'Da rimborsare';
export const INVESTIMENTI = 'Investimenti';
export const BUONI_PASTO = 'Buoni pasto';

/* categorie che si possono escludere dal "totale portafoglio" (Impostazioni) */
export const ESCLUDIBILI = [BUONI_PASTO, DA_RIMBORSARE, INVESTIMENTI];

export const FILTRI_STORICO = ['Tutti', 'Uscite', 'Entrate', DA_RIMBORSARE, INVESTIMENTI];

export const COLORE_DEFAULT = '#8A8178';
export const COLORE_FUORI = '#DDD5C7'; // fette delle categorie escluse dal portafoglio

export const CAT_USCITE = [
  ['Spesa settimanale','#7A8B3F'], ['Affitto','#4A5C8C'], ['Bollette','#3E8391'],
  ['Tasse/Commissioni','#6E6A63'], ['Abbonamenti','#7B4BC4'], ['Spese mediche','#B0435A'],
  ['Trasporti','#2E7356'], ['Svago','#C4763B'], ['Viaggi','#2F6E8F'], ['Regali','#B44A86'],
  ['Spese personali','#8E5BA6'], ['Cibo asporto/ristorante','#C0452B'], ['Automobile','#5A5F6B'],
  ['Carburante','#A45A2A'], ['Pedaggi auto','#86714E'], [BUONI_PASTO,'#B8801C'],
  [DA_RIMBORSARE,'#A8863C'], [INVESTIMENTI,'#2B6B5D'], ['Altro','#8A8178']
];
export const CAT_ENTRATE = [
  ['Stipendio','#2E7356'], ['Rimborsi','#5B4BC4'], [INVESTIMENTI,'#2B6B5D'],
  [BUONI_PASTO,'#B8801C'], ['Altro','#8A8178']
];
