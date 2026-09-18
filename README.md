# Butterflies in the wallet

App per tenere traccia di entrate e uscite personali. Sostituisce il foglio Excel
"Modello Butterflies in the wallet": stesse categorie, stessa logica di
"totale portafoglio", stesso budget per categoria.

I dati vivono in un file **`wallet-data.json`** in una cartella del telefono, scelta
dall'utente. L'app lo riscrive a ogni modifica. Nessun server, nessun account,
nessun dato che esce dal dispositivo.

---

## Installare sul telefono (Samsung / Android)

1. Pubblica questa cartella su un indirizzo **HTTPS** (vedi sotto: GitHub Pages).
2. Apri l'indirizzo con **Chrome** sul telefono.
3. Menu ⋮ → **Installa app** (o "Aggiungi a schermata Home").
4. Apri l'app dall'icona. Vai in **Impostazioni → Scegli la cartella** e indica dove
   salvare `wallet-data.json`.

> Suggerimento: scegli una cartella sincronizzata con Google Drive o OneDrive.
> Hai backup automatico e apri lo stesso file dal PC.

Il permesso sulla cartella è persistente: Chrome non lo richiede a ogni avvio.
Se lo revochi, l'app continua a funzionare salvando nel browser e l'indicatore in
testata diventa giallo — basta ricollegare la cartella.

---

## Pubblicare con GitHub Pages

```bash
git clone https://github.com/LuigiFederico/wallet-app.git
cd wallet-app
# copia qui il contenuto della cartella pwa/ (index.html, app.js, sw.js, manifest, icons/)
git add .
git commit -m "PWA Butterflies in the wallet"
git push
```

Poi su GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `root`**.

Dopo un minuto l'app è su `https://luigifederico.github.io/wallet-app/`.

Se preferisci tenere i file dentro `pwa/`, imposta Pages su `main` / `/docs` e
rinomina la cartella in `docs`, oppure sposta i file nella radice del repo.

---

## Cosa c'è dentro

| File | A cosa serve |
| --- | --- |
| `index.html` | struttura e stile dell'app |
| `app.js` | tutta la logica: dati, viste, salvataggio su file, export |
| `sw.js` | service worker — l'app funziona offline |
| `manifest.webmanifest` | nome, icone, avvio a schermo intero |
| `icons/` | icone 192 / 512 / maskable, generate dal logo |
| `.nojekyll` | evita che GitHub Pages ignori alcuni file |

---

## Formato di `wallet-data.json`

```json
{
  "versione": 1,
  "valuta": "EUR",
  "aggiornato": "2026-09-18T09:14:00.000Z",
  "escludiDaPortafoglio": {
    "uscite": ["Buoni pasto", "Da rimborsare", "Investimenti"],
    "entrate": ["Buoni pasto", "Investimenti"]
  },
  "categorie": {
    "uscite": [{ "nome": "Affitto", "colore": "#4A5C8C" }],
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

Le voci con categoria `Da rimborsare` hanno in più `"rimborsato": false` finché non
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
