// 폰 안의 IndexedDB에 모든 데이터를 저장한다. 서버는 없다.
const DB_NAME = 'handdrip';
const DB_VERSION = 1;
const STORES = ['beans', 'recipes', 'brews', 'photos'];

let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

const wait = req => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const done = tx => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = tx.onabort = () => reject(tx.error);
});

export async function all(store) {
  const db = await open();
  return wait(db.transaction(store).objectStore(store).getAll());
}

export async function get(store, id) {
  if (!id) return null;
  const db = await open();
  return (await wait(db.transaction(store).objectStore(store).get(id))) || null;
}

export async function put(store, value) {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  return done(tx);
}

export async function del(store, id) {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(id);
  return done(tx);
}
