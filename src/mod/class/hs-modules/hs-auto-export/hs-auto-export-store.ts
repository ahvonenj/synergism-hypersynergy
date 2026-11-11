import type { HSExportDirectoryHandle } from '../../../types/module-types/hs-auto-export-types';

const DB_NAME = 'hs-auto-export';
const DB_STORE = 'state';

interface HSExportStoredValues {
    folder: HSExportDirectoryHandle;
    files: string[];
}

/** Folder handles require IndexedDB's structured storage rather than HSStorage's JSON. */
export class HSAutoExportStore {
    #openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => { request.result.createObjectStore(DB_STORE); };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /** Stored values are checked by the folder controller before use. */
    async read(key: keyof HSExportStoredValues): Promise<unknown> {
        const db = await this.#openDB();
        try {
            return await new Promise<unknown>((resolve, reject) => {
                const request = db.transaction(DB_STORE).objectStore(DB_STORE).get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } finally {
            db.close();
        }
    }

    /** undefined removes the key. */
    async write<K extends keyof HSExportStoredValues>(key: K, value: HSExportStoredValues[K] | undefined): Promise<void> {
        const db = await this.#openDB();
        try {
            await new Promise<void>((resolve, reject) => {
                const transaction = db.transaction(DB_STORE, 'readwrite');
                if (value === undefined) transaction.objectStore(DB_STORE).delete(key);
                else transaction.objectStore(DB_STORE).put(value, key);
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
        } finally {
            db.close();
        }
    }
}
