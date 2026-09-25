# Butterflies in the wallet

App per tenere traccia di entrate e uscite personali. Sostituisce il foglio Excel
"Modello Butterflies in the wallet": stesse categorie, stessa logica di
"totale portafoglio", stesso budget per categoria.

I dati vivono in un file **`wallet-data.json`** in una cartella del telefono, scelta
dall'utente. L'app lo riscrive a ogni modifica. Nessun server, nessun account,
nessun dato che esce dal dispositivo.

---

## Installare sul telefono (Samsung / Android)

1. Pubblica l'app su un indirizzo **HTTPS** (vedi sotto: GitHub Pages).
2. Apri l'indirizzo con **Chrome** sul telefono.
3. Menu ⋮ → **Installa app** (o "Aggiungi a schermata Home").
4. Apri l'app dall'icona. Vai in **Impostazioni → Scegli la cartella** e indica dove
   salvare `wallet-data.json`.

> Suggerimento: scegli una cartella sincronizzata con Google Drive o OneDrive.
> Hai backup automatico e apri lo stesso file dal PC.

Il permesso sulla cartella è persistente: Chrome non lo richiede a ogni avvio.
Se lo revochi, l'app continua a funzionare salvando nel browser e l'indicatore in
testata diventa rosso («Accesso scaduto»): da **Impostazioni → Riattiva l'accesso**
torna a scrivere nella stessa cartella, oppure il browser lo chiede al prossimo salvataggio.

Se la cartella contiene già un `wallet-data.json` diverso dai dati del telefono (o il
file è stato aggiornato da un altro dispositivo), l'app chiede quale versione tenere e
salva l'altra accanto, come `wallet-data.backup-AAAA-MM-GG.json`.

---

## Sviluppo

Serve Node.js 22+.

```bash
npm install
npm run dev       # server di sviluppo con ricarica automatica
npm test          # test della logica (node:test)
npm run build     # build di produzione in dist/
npm run preview   # prova la build in locale, service worker compreso
```

In sviluppo il service worker non viene registrato, così non servono file vecchi dalla cache.

---

## Pubblicare con GitHub Pages

Il workflow `.github/workflows/deploy.yml`, a ogni push su `main`, esegue i test, fa la
build e pubblica `dist/` su GitHub Pages.

Da impostare una volta sola su GitHub: **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

L'app è su `https://luigifederico.github.io/wallet-app/`.

---

## Struttura

```
index.html              guscio dell'app (header, tab bar, contenitori)
vite.config.js          build + generazione di sw.js con i file da mettere in cache
public/                 copiati così come sono: manifest.webmanifest, icons/
src/
  main.js               punto di ingresso
  state.js              stato dell'app (dati + stato dell'interfaccia)
  azioni.js             modifiche ai dati, con annulla
  persistenza.js        avvio, salvataggio su file / localStorage, scelta cartella
  sw.js                 service worker (template, completato dalla build)
  core/                 logica pura, senza DOM: costanti, formattazione, dati, calcoli
  storage/              File System Access API e IndexedDB
  export/               .json, .csv, .xlsx (zip minimale scritto a mano)
  ui/                   render, eventi, toast, componenti condivisi
    viste/              casa, storico, statistiche, impostazioni
    sheet/              pannelli "aggiungi / modifica", "dettaglio", "quale versione tenere" e "categoria"
  styles/               CSS: variabili colore, base, layout, componenti, viste, sheet
tests/                  test di core/ ed export/
```

---

## Formato di `wallet-data.json`

```json
{
  "versione": 2,
  "valuta": "EUR",
  "aggiornato": "2026-09-18T09:14:00.000Z",
  "escludiDaPortafoglio": {
    "uscite": ["Buoni pasto", "Da rimborsare", "Investimenti"],
    "entrate": ["Buoni pasto", "Investimenti"]
  },
  "categorie": {
    "uscite": [
      { "nome": "Affitto", "colore": "#4A5C8C" },
      { "nome": "Da rimborsare", "colore": "#A8863C", "ruolo": "rimborso" }
    ],
    "entrate": [{ "nome": "Stipendio", "colore": "#2E7356" }]
  },
  "budget": {
    "2026-09": { "Affitto": 620, "Spesa settimanale": 260 }
  },
  "movimenti": [
    {
      "id": "m1726650000000",
      "tipo": "uscita",
      "data": "2026-09-18",
      "importo": 42.5,
      "categoria": "Spesa settimanale",
      "descrizione": "Esselunga"
    }
  ]
}
```

Il campo `ruolo` lega un comportamento speciale alla categoria, qualunque sia il suo nome:
`rimborso` (spunta "rimborsato" e filtro nello Storico), `investimenti` (filtro nello Storico)
e `buoniPasto`. Le categorie con questi tre ruoli hanno l'interruttore "Conta nel totale
portafoglio" in Impostazioni. I file della versione 1 non avevano i ruoli: all'apertura li
ricevono le categorie `Da rimborsare`, `Investimenti` e `Buoni pasto`.

Le voci di una categoria con ruolo `rimborso` hanno in più `"rimborsato": false` finché non
le segni come rimborsate.

Il file è leggibile e modificabile a mano: se lo cambi da fuori, riapri l'app e lo
rilegge all'avvio.

---

## Export

- **.json** — copia completa dei dati
- **.csv** — si apre in Excel, una riga per movimento
- **.xlsx** — cartella di lavoro con un foglio per mese più il Riepilogo, come nel
  modello originale

---

## Funziona senza cartella collegata?

Sì. Senza permesso sui file l'app salva nel browser (`localStorage`) e puoi
esportare a mano. I dati restano, ma sono legati a quel browser: se disinstalli
Chrome o cancelli i dati del sito, spariscono. Per questo conviene collegare una
cartella al primo avvio.

## Browser supportati per la scrittura diretta su file

| Browser | Scrittura su file |
| --- | --- |
| Chrome / Edge Android | sì |
| Chrome / Edge desktop | sì |
| Firefox, Safari | no — solo salvataggio nel browser ed export manuale |
