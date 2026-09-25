/* Lettura/scrittura di wallet-data.json nella cartella scelta
   (File System Access API: Chrome/Edge su Android e desktop). */

import { FILENAME } from '../core/costanti.js';

export const supportaFS = typeof window.showDirectoryPicker === 'function';

export async function chiediCartella() {
  const h = await window.showDirectoryPicker({ id: 'wallet', mode: 'readwrite', startIn: 'documents' });
  return (await h.requestPermission({ mode: 'readwrite' })) === 'granted' ? h : null;
}

export async function permessoAttivo(h) {
  return (await h.queryPermission({ mode: 'readwrite' })) === 'granted';
}

/* Contenuto del file già interpretato, oppure null se manca o non è JSON valido. */
export async function leggiFile(dirHandle) {
  if (!dirHandle) return null;
  try {
    const fh = await dirHandle.getFileHandle(FILENAME);
    const txt = await (await fh.getFile()).text();
    return JSON.parse(txt);
  } catch (e) { return null; }
}

export async function scriviFile(dirHandle, testo) {
  const fh = await dirHandle.getFileHandle(FILENAME, { create: true });
  const w = await fh.createWritable();
  await w.write(testo);
  await w.close();
}
