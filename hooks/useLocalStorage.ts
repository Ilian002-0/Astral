import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';

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
                   setDataState(deepParse(storedValue) ?? initialValue);
                } else {
                   // If nothing is in the DB, store the initial value.
                   setDBItem(key, deepStringify(initialValue));
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
                setDBItem(key, deepStringify(valueToStore));
            } catch (error) {
                console.error(`Error setting IndexedDB key “${key}”:`, error);
            }
            return valueToStore;
        });
    }, [key]);

    return { data, setData, isLoading };
}

export default useDBStorage;