const CACHE_NAME = 'atlas-cache-v13';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://i.imgur.com/TN8saNO.png', // Main app logo/favicon
    // PWA icons from manifest
    'https://i.imgur.com/gA2QYp9.png', // 192x192
    'https://i.imgur.com/pB3S7Lq.png', // 512x512
    'https://i.imgur.com/s4f3z2g.png', // 512x512 maskable
    // Shortcut icons from manifest
    'https://i.imgur.com/rS2Xw9L.png',
    'https://i.imgur.com/dK7E8fM.png',
    'https://i.imgur.com/fG3H2jJ.png',
    'https://i.imgur.com/zW6T5bB.png',
    // Locales for notifications
    '/locales/en.json',
    '/locales/fr.json',
];

// --- IndexedDB Helpers ---
const DB_NAME = 'atlas-db';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

let dbPromise;
function getDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = self.indexedDB.open(DB_NAME, DB_VERSION);
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

async function getDBItem(key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
async function setDBItem(key, value) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

const dateReviver = (key, value) => {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (typeof value === 'string' && isoDateRegex.test(value)) {
    return new Date(value);
  }
  return value;
};
const deepParse = (jsonString) => {
    if (!jsonString) return null;
    return JSON.parse(jsonString, dateReviver);
};


// --- Service Worker Lifecycle ---

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.startsWith('https://aistudiocdn.com') || event.request.url.startsWith('https://cdn.tailwindcss.com')) {
        return; // Let the browser handle these requests
    }
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});


// --- Background Sync & Notifications ---

let translations = {};
const fetchTranslations = async () => {
    try {
        const enRes = await fetch('/locales/en.json');
        const frRes = await fetch('/locales/fr.json');
        translations['en'] = await enRes.json();
        translations['fr'] = await frRes.json();
    } catch (e) {
        console.error('Failed to fetch translations for notifications', e);
    }
}

const t = (language, key, options) => {
    const lang = language === 'fr' ? 'fr' : 'en';
    if (!translations[lang]) return key;
    const keyParts = key.split('.');
    let translation = translations[lang];
    for (const part of keyParts) {
        translation = translation?.[part];
    }
    if (typeof translation === 'string' && options) {
        return Object.entries(options).reduce((str, [optKey, optValue]) => {
            return str.replace(new RegExp(`{{${optKey}}}`, 'g'), String(optValue));
        }, translation);
    }
    return translation || key;
};

const showNotification = (title, options) => {
    self.registration.showNotification(title, options);
};

const saveNotificationToHistory = async (notification) => {
    const historyString = await getDBItem('notification_history');
    const history = deepParse(historyString) || [];
    history.unshift(notification);
    if (history.length > 50) history.pop();
    await setDBItem('notification_history', JSON.stringify(history));
};

const handlePeriodicSync = async () => {
    console.log('Periodic sync event fired!');
    await fetchTranslations();
    const accountsString = await getDBItem('trading_accounts_v1');
    const settingsString = await getDBItem('notification_settings');
    const lang = await getDBItem('language').then(res => deepParse(res) || 'en');

    const accounts = deepParse(accountsString) || [];
    const settings = deepParse(settingsString) || { tradeClosed: true, weeklySummary: true };

    for (const account of accounts) {
        if (!account.dataUrl) continue;
        
        try {
            const response = await fetch(account.dataUrl, { cache: 'no-store' });
            if (!response.ok) continue;
            const csvText = await response.text();

            // Minimal parser for service worker
            const newTrades = csvText.split('\n').slice(1).map(line => {
                const data = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                if (data.length < 11) return null;
                return { ticket: parseInt(data[0]), closeTime: new Date(data[6].replace(/\./g, '-')) };
            }).filter(t => t && !isNaN(t.ticket));
            
            const existingTickets = new Set(account.trades.map(t => t.ticket));
            const newlyClosedTrades = newTrades.filter(t => t && !existingTickets.has(t.ticket));

            if (settings.tradeClosed && newlyClosedTrades.length > 0) {
                 for (const trade of newlyClosedTrades) {
                    // We don't have full trade details, so notification is generic
                    const title = t(lang, 'notifications.trade_closed_title');
                    const body = `New trade detected in ${account.name}`;
                     const notificationItem = { id: `trade-${Date.now()}`, title, body, timestamp: Date.now(), read: false };
                    showNotification(title, { body, tag: `trade-${trade.ticket}` });
                    await saveNotificationToHistory(notificationItem);
                 }
            }

        } catch (e) {
            console.error('Error during background sync for account:', account.name, e);
        }
    }
};

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'account-sync') {
        event.waitUntil(handlePeriodicSync());
    }
});

// For scheduled weekly notification
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'trigger-weekly-summary') {
         event.waitUntil(handleWeeklySummary());
    }
});
