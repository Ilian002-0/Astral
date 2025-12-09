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

// Helper to check if a string looks like valid JSON to avoid parsing compressed garbage
const isJsonCandidate = (str: string) => {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    const first = trimmed.charAt(0);
    return first === '{' || first === '[' || first === '"' || first === 't' || first === 'f' || first === 'n' || (first >= '0' && first <= '9') || first === '-';
};

interface DBStorage<T> {
    data: T;
    setData: (value: T | ((prevState: T) => T)) => void;
    isLoading: boolean;
}

function useDBStorage<T>(key: string, initialValue: T): DBStorage<T> {
    // HYBRID INITIALIZATION: 
    // Try to load from localStorage FIRST (Synchronous) to provide instant data.
    const [data, setDataState] = useState<T>(() => {
        if (typeof window !== 'undefined') {
            try {
                const localItem = window.localStorage.getItem(key);
                if (localItem) {
                    // Try decompressing first
                    const decompressed = LZString.decompressFromUTF16(localItem);
                    const raw = decompressed || localItem;
                    
                    let parsed = deepParse(raw);
                    if (parsed !== undefined) {
                        if (key === 'trading_accounts_v1' && Array.isArray(parsed)) {
                             // @ts-ignore
                             parsed = unpackAccounts(parsed);
                        }
                        return parsed as T;
                    }
                }
            } catch (error) {
                console.warn(`Error reading localStorage key "${key}":`, error);
            }
        }
        return initialValue;
    });

    // If we successfully loaded from localStorage, we are NOT loading.
    // If we fell back to initialValue, we are loading (waiting for IndexedDB).
    const [isLoading, setIsLoading] = useState(() => {
        if (typeof window !== 'undefined' && window.localStorage.getItem(key)) {
            return false;
        }
        return true;
    });

    // Load from IndexedDB (Async Source of Truth)
    useEffect(() => {
        let isMounted = true;
        getDBItem<string>(key).then(storedValue => {
            if (isMounted) {
                if (storedValue) {
                    let parsed: any = undefined;

                    // 1. Try to decompress
                    const decompressed = LZString.decompressFromUTF16(storedValue);
                    
                    if (decompressed !== null) {
                        try {
                            parsed = deepParse(decompressed);
                        } catch (e) {
                            console.warn(`Decompressed data for key "${key}" is not valid JSON.`);
                        }
                    }

                    // 2. Fallback to raw JSON
                    if (parsed === undefined) {
                        if (isJsonCandidate(storedValue)) {
                            try {
                                parsed = deepParse(storedValue);
                            } catch(e) {
                                console.error(`Failed to parse legacy data for key "${key}"`, e);
                            }
                        }
                    }

                    // 3. Process result
                    if (parsed !== undefined) {
                        if (key === 'trading_accounts_v1' && Array.isArray(parsed)) {
                             // @ts-ignore
                             parsed = unpackAccounts(parsed);
                        }
                        
                        // Only update state if different from what we loaded from localStorage to avoid re-renders
                        // Note: Deep comparison is expensive, so we just set it. React handles reference checks.
                        setDataState(parsed as T);
                    } 
                } 
                // If nothing in DB, we rely on initialValue or what was in localStorage
                
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
                if (key === 'trading_accounts_v1' && Array.isArray(valueToStore)) {
                    // @ts-ignore
                    preparedValue = packAccounts(valueToStore);
                }

                const stringified = deepStringify(preparedValue);
                const compressed = LZString.compressToUTF16(stringified);
                
                // 1. Save to IndexedDB (The robust storage)
                setDBItem(key, compressed);

                // 2. Save to LocalStorage (The fast cache)
                // We wrap this in a separate try-catch because it might fail if quota exceeded (5MB limit)
                try {
                    window.localStorage.setItem(key, compressed);
                } catch (e) {
                    console.warn("LocalStorage quota exceeded. Data saved to IndexedDB only.");
                }

            } catch (error) {
                console.error(`Error setting storage key “${key}”:`, error);
            }
            return valueToStore;
        });
    }, [key]);

    return { data, setData, isLoading };
}

export default useDBStorage;