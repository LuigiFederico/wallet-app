import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/* Genera dist/sw.js da src/sw.js inserendo i file prodotti dalla build
   (nomi con hash) nella lista di precache, e una versione della cache
   che cambia a ogni build con contenuto diverso. */
function serviceWorker() {
  return {
    name: 'butterflies-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const nomi = Object.keys(bundle).filter((f) => f !== 'index.html').sort();
      const hash = createHash('sha256');
      nomi.forEach((f) => hash.update(bundle[f].type === 'chunk' ? bundle[f].code : bundle[f].source));
      const sorgente = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8')
        .replace('__VERSIONE__', hash.digest('hex').slice(0, 10))
        .replace("'__FILE_BUILD__'", nomi.map((f) => JSON.stringify('./' + f)).join(',\n  '));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sorgente });
    }
  };
}

export default defineConfig({
  // percorsi relativi: l'app funziona sotto https://<utente>.github.io/wallet-app/
  base: './',
  plugins: [serviceWorker()]
});
