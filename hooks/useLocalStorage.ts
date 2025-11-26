
import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import LZString from 'lz-string';
import { packAccounts, unpackAccounts } from '../utils/dataOptimizer';

// --- IndexedDB Helpers ---
const DB_NAME = 'atlas-db';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

let dbPromise: Promise<IDBDatabase> | null = null;
function getDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                    request.result.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return dbPromise;
}

async function getDBItem<T>(key: string): Promise<T | undefined> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function setDBItem<T>(key: string, value: T): Promise<IDBValidKey> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// --- Date Reviver for JSON Serialization in IndexedDB ---
const dateReviver = (key: string, value: any) => {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (typeof value === 'string' && isoDateRegex.test(value)) {
    return new Date(value);
  }
  return value;
};
// We need to stringify with a replacer to handle nested dates correctly
const dateReplacer = (key: string, value: any) => {
    if (value instanceof Date) {
        return value.toISOString();
    }
    return value;
};
const deepParse = (jsonString: string) => {
    if (!jsonString) return null;
    return JSON.parse(jsonString, dateReviver);
};
const deepStringify = (obj: any) => {
    return JSON.stringify(obj, dateReplacer);
};

interface DBStorage<T> {
    data: T;
    setData: (value: T | ((prevState: T) => T)) => void;
    isLoading: boolean;
}

function useDBStorage<T>(key: string, initialValue: T): DBStorage<T> {
    const [data, setDataState] = useState<T>(initialValue);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        getDBItem<string>(key).then(storedValue => {
            if (isMounted) {
                if (storedValue) {
                    // Try to decompress first
                    let parsed = null;
                    const decompressed = LZString.decompressFromUTF16(storedValue);
                    
                    if (decompressed) {
                         // If decompression returned a string, try parsing it as JSON
                        try {
                            parsed = deepParse(decompressed);
                        } catch (e) {
                            console.warn(`Decompressed data for key "${key}" is not valid JSON.`);
                        }
                    }

                    // If decompression returned null or parsing failed, assume it's legacy uncompressed data
                    if (!parsed) {
                        try {
                             parsed = deepParse(storedValue);
                        } catch(e) {
                             console.error(`Failed to parse data for key "${key}"`, e);
                        }
                    }

                    // --- STRUCTURAL UNPACKING ---
                    // If this is the accounts key, check if data is packed (array of arrays)
                    if (key === 'trading_accounts_v1' && Array.isArray(parsed)) {
                         // @ts-ignore - We know T is Account[] here effectively
                         parsed = unpackAccounts(parsed);
                    }

                   setDataState(parsed ?? initialValue);
                } else {
                   // If nothing is in the DB, store the initial value (compressed).
                   // We don't pack initialValue here assuming it's empty, but consistency is good.
                   const stringified = deepStringify(initialValue);
                   const compressed = LZString.compressToUTF16(stringified);
                   setDBItem(key, compressed);
                   setDataState(initialValue);
                }
                setIsLoading(false);
            }
        }).catch(err => {
            console.error(`Error reading IndexedDB key “${key}”:`, err);
            setIsLoading(false);
        });

        return () => { isMounted = false; };
    }, [key]);

    const setData = useCallback((value: T | ((prevState: T) => T)) => {
        setDataState(currentState => {
            const valueToStore = value instanceof Function ? value(currentState) : value;
            try {
                let preparedValue = valueToStore;

                // --- STRUCTURAL PACKING ---
                // If storing accounts, convert to optimized column format before stringifying
                if (key === 'trading_accounts_v1' && Array.isArray(valueToStore)) {
                    // @ts-ignore
                    preparedValue = packAccounts(valueToStore);
                }

                const stringified = deepStringify(preparedValue);
                const compressed = LZString.compressToUTF16(stringified);
                setDBItem(key, compressed);
            } catch (error) {
                console.error(`Error setting IndexedDB key “${key}”:`, error);
            }
            return valueToStore;
        });
    }, [key]);

    return { data, setData, isLoading };
}

export default useDBStorage;
