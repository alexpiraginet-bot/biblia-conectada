import { ReadingProgressError } from "./model";
import { READING_PROGRESS_KEY } from "./store-core";

export const READING_LOCK_DATABASE = "bc-reading-progress-lock-v1";
const LOCK_STORE = "mutex";
const lockError = () => new ReadingProgressError("O navegador não permitiu coordenar o salvamento entre abas. Nenhuma nova marcação foi confirmada. Permita o armazenamento local; sua leitura e a exportação continuam disponíveis.");
export type ReadingLockPlatform = { locks?: Pick<LockManager, "request">; indexedDB?: IDBFactory };

/** Serializes the synchronous localStorage transaction across all tabs of this origin. */
export function createReadingBrowserLock(platform: () => ReadingLockPlatform) {
  let connection: Promise<IDBDatabase> | null = null;
  function database(factory: IDBFactory): Promise<IDBDatabase> {
    if (connection) return connection;
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest, finished = false;
      const timer = setTimeout(() => { if (!finished) { finished = true; reject(lockError()); } }, 5000);
      const fail = () => { if (!finished) { finished = true; clearTimeout(timer); reject(lockError()); } };
      try { request = factory.open(READING_LOCK_DATABASE, 1); } catch { fail(); return; }
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(LOCK_STORE)) request.result.createObjectStore(LOCK_STORE); };
      request.onerror = fail; request.onblocked = fail;
      request.onsuccess = () => {
        const db = request.result;
        if (finished) { db.close(); return; }
        finished = true; clearTimeout(timer);
        db.onversionchange = () => { db.close(); connection = null; };
        db.onclose = () => { connection = null; };
        resolve(db);
      };
    });
    connection = opening;
    void opening.catch(() => { if (connection === opening) connection = null; });
    return opening;
  }
  return async function withLock<T>(operation: () => T): Promise<T> {
    let available: ReadingLockPlatform;
    try { available = platform(); } catch { throw lockError(); }
    if (available.locks?.request) {
      let operationFailed = false;
      try { return await available.locks.request(READING_PROGRESS_KEY, () => { try { return operation(); } catch (error) { operationFailed = true; throw error; } }); }
      catch (error) { throw operationFailed ? error : lockError(); }
    }
    if (!available.indexedDB) throw lockError();
    const db = await database(available.indexedDB);
    return new Promise<T>((resolve, reject) => {
      let transaction: IDBTransaction, result: T, didRun = false, operationFailed = false, operationError: unknown;
      try { transaction = db.transaction(LOCK_STORE, "readwrite"); }
      catch { connection = null; reject(lockError()); return; }
      transaction.oncomplete = () => { if (didRun) resolve(result!); else reject(lockError()); };
      transaction.onabort = () => reject(operationFailed ? operationError : lockError());
      transaction.onerror = () => { /* onabort is the terminal error event. */ };
      const store = transaction.objectStore(LOCK_STORE), request = store.get("writer");
      request.onsuccess = () => {
        try {
          // IndexedDB orders readwrite transactions on the same object store across
          // connections/tabs. Keep the whole localStorage operation synchronous here.
          result = operation(); didRun = true;
          store.put(1, "writer");
        } catch (error) { operationFailed = true; operationError = error; transaction.abort(); }
      };
    });
  };
}

export const withReadingProgressLock = createReadingBrowserLock(() => ({
  locks: typeof navigator === "undefined" ? undefined : navigator.locks,
  indexedDB: typeof indexedDB === "undefined" ? undefined : indexedDB,
}));
