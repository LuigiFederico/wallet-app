/* IndexedDB: conserva l'handle della cartella scelta tra un avvio e l'altro. */

function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('butterflies-fs', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('handles', mode);
      const out = fn(tx.objectStore('handles'));
      tx.oncomplete = () => { db.close(); resolve(out && out.result !== undefined ? out.result : out); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}

export const salvaHandle = (h) => idb('readwrite', (st) => st.put(h, 'dir'));
export const leggiHandle = () => idb('readonly', (st) => st.get('dir'));
