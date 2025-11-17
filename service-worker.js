
// --- CONSTANTS & CONFIG ---
const CACHE_NAME = 'atlas-cache-v23'; // Incremented cache version
const ASSETS_TO_CACHE = [
    '/', '/index.html', '/manifest.json', '/logo.svg',
    '/dashboard-icon.svg', '/list-icon.svg', '/calendar-icon.svg', '/goals-icon.svg',
    '/locales/en.json', '/locales/fr.json',
];
const DB_NAME = 'atlas-db';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

// --- IndexedDB UTILITY FUNCTIONS ---
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
            request.onerror = (e) => {
                console.error('DB Error:', e);
                reject(request.error);
            };
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


// --- JSON SERIALIZATION WITH DATE SUPPORT ---
const dateReviver = (key, value) => {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    if (typeof value === 'string' && isoDateRegex.test(value)) {
        return new Date(value);
    }
    return value;
};
const dateReplacer = (key, value) => (value instanceof Date ? value.toISOString() : value);
const deepParse = (jsonString) => (jsonString ? JSON.parse(jsonString, dateReviver) : null);
const deepStringify = (obj) => JSON.stringify(obj, dateReplacer);


// --- CSV PARSER (MIRRORS MAIN APP) ---
const parseCSV_SW = (content) => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    const headerLine = lines[0];
    const separator = headerLine.includes('\t') ? '\t' : ',';

    const header = headerLine.split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const colMap = {};
    header.forEach((h, i) => {
        if (h === 'order' || h === 'ticket') colMap['ticket'] = i;
        if (h === 'open time') colMap['openTime'] = i;
        if (h === 'type') colMap['type'] = i;
        if (h === 'volume' || h === 'size') colMap['size'] = i;
        if (h === 'symbol') colMap['symbol'] = i;
        if (h === 'open price') colMap['openPrice'] = i;
        if (h === 'close time') colMap['closeTime'] = i;
        if (h === 'close price') colMap['closePrice'] = i;
        if (h === 'commission') colMap['commission'] = i;
        if (h === 'swap') colMap['swap'] = i;
        if (h === 'profit') colMap['profit'] = i;
        if (h === 'comment') colMap['comment'] = i;
    });
    
    const parseDecimal = (value) => {
        if (typeof value !== 'string' || value.trim() === '') return 0;
        return parseFloat(value.replace(/"/g, '').trim().replace(',', '.'));
    };
    
    const getCleanString = (index, data) => (data[index] || '').trim().replace(/"/g, '');
    const parseMT5Date = (dateStr) => (dateStr && dateStr.trim() ? new Date(dateStr.replace(/"/g, '').replace(/\./g, '-').trim()) : new Date(0));

    return lines.slice(1).map(line => {
      const data = line.split(separator === ',' ? /,(?=(?:(?:[^"]*"){2})*[^"]*$)/ : /\t/);
      if (data.length <= Math.max(...Object.values(colMap))) return null;

      const type = getCleanString(colMap['type'], data);
      const profit = parseDecimal(data[colMap['profit']]);
      
      if (type === 'balance') {
        const opTime = parseMT5Date(data[colMap['openTime']]);
        if (isNaN(opTime.getTime()) || opTime.getTime() === 0) return null;
        return {
          ticket: parseInt(getCleanString(colMap['ticket'], data), 10) || opTime.getTime(),
          openTime: opTime, type: 'balance', size: 0, symbol: 'Balance',
          openPrice: 0, closeTime: opTime, closePrice: 1, commission: 0, swap: 0, profit: profit,
          comment: getCleanString(colMap['comment'], data) || (profit > 0 ? 'Deposit' : 'Withdrawal')
        };
      }

      if (isNaN(profit)) return null;

      return {
        ticket: parseInt(getCleanString(colMap['ticket'], data), 10),
        openTime: parseMT5Date(data[colMap['openTime']]),
        type: type,
        size: parseDecimal(data[colMap['size']]),
        symbol: getCleanString(colMap['symbol'], data),
        openPrice: parseDecimal(data[colMap['openPrice']]),
        closeTime: parseMT5Date(data[colMap['closeTime']]),
        closePrice: parseDecimal(data[colMap['closePrice']]),
        commission: parseDecimal(data[colMap['commission']]),
        swap: parseDecimal(data[colMap['swap']]),
        profit: profit,
        comment: colMap['comment'] !== undefined ? getCleanString(colMap['comment'], data) : ''
      };
    }).filter(trade => {
        if (!trade) return false;
        // Corrected filter logic: Allow trades where closeTime is epoch (i.e., open trades)
        return !isNaN(trade.ticket) &&
               trade.openTime instanceof Date && !isNaN(trade.openTime.getTime()) && trade.openTime.getTime() !== 0 &&
               trade.closeTime instanceof Date && !isNaN(trade.closeTime.getTime());
    });
};


// --- SERVICE WORKER LIFECYCLE ---
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((names) => Promise.all(names.map((n) => n !== CACHE_NAME && caches.delete(n))))
        .then(() => self.clients.claim())
        .then(() => { console.log('SW: Activated. Running initial sync.'); return runSync(); })
    );
});

self.addEventListener('fetch', (e) => {
    // Standard network-first, then cache fallback strategy
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});


// --- NOTIFICATION & SYNC LOGIC ---
let translations = {};
const fetchTranslations = async () => {
    if (Object.keys(translations).length) return;
    try {
        const [enRes, frRes] = await Promise.all([fetch('/locales/en.json'), fetch('/locales/fr.json')]);
        translations = { en: await enRes.json(), fr: await frRes.json() };
        console.log('SW: Translations loaded.');
    } catch (e) { console.error('SW: Failed to fetch translations', e); }
};

const t = (lang, key, opts) => {
    let str = key.split('.').reduce((o, i) => o?.[i], translations[lang === 'fr' ? 'fr' : 'en']) || key;
    if (opts) Object.entries(opts).forEach(([k, v]) => str = str.replace(`{{${k}}}`, v));
    return str;
};

const findNewlyClosedTrades = (newTrades, oldTrades) => {
    const oldTradesMap = new Map(oldTrades.map(t => [t.ticket, t]));
    return newTrades.filter(newTrade => {
        // We only care about actual trades that are now closed
        if (newTrade.type === 'balance' || newTrade.closePrice === 0) return false;
        
        const oldTrade = oldTradesMap.get(newTrade.ticket);
        // A trade is newly closed if:
        // 1. It didn't exist before (is a brand new, already closed trade in the file)
        // 2. It existed before, but was open (closePrice was 0)
        return !oldTrade || oldTrade.closePrice === 0;
    });
};

const notifyForTrades = (trades, account, lang, settings) => {
    if (!settings.tradeClosed || !trades.length) return;
    console.log(`SW: Found ${trades.length} new trades for ${account.name}. Sending notifications.`);
    trades.forEach(trade => {
        const currency = account.currency === 'EUR' ? '€' : '$';
        const title = t(lang, 'notifications.trade_closed_title');
        const body = t(lang, 'notifications.trade_closed_body', { symbol: trade.symbol, profit: trade.profit.toFixed(2), currency });
        self.registration.showNotification(title, { body, tag: `trade-${trade.ticket}`, icon: '/logo.svg', data: { url: `${self.location.origin}/?view=trades` } });
    });
};

async function runSync() {
    console.log('SW: --- Starting background sync ---');
    await fetchTranslations();
    
    const [accountsStr, settingsStr, lang] = await Promise.all([
        getDBItem('trading_accounts_v1'),
        getDBItem('notification_settings'),
        getDBItem('language').then(val => deepParse(val) || 'en'),
    ]);

    let originalAccounts = deepParse(accountsStr) || [];
    if (!originalAccounts.length) {
        console.log('SW: No accounts configured. Sync finished.');
        return;
    }
    const settings = deepParse(settingsStr) || { tradeClosed: true, weeklySummary: true };
    let accountsToSave = [...originalAccounts];
    let dataWasChanged = false;

    for (let i = 0; i < originalAccounts.length; i++) {
        const account = originalAccounts[i];
        if (!account.dataUrl) {
            console.log(`SW: Account "${account.name}" has no data URL, skipping.`);
            continue;
        }

        console.log(`SW: Processing account: "${account.name}"`);
        try {
            const response = await fetch(account.dataUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
            
            const csvText = await response.text();
            const newTrades = parseCSV_SW(csvText);
            
            if (newTrades.length === 0 && account.trades.length > 0) {
                console.warn(`SW: Fetched empty file for "${account.name}". Skipping update to avoid data loss.`);
                continue;
            }

            const newlyClosed = findNewlyClosedTrades(newTrades, account.trades);
            notifyForTrades(newlyClosed, account, lang, settings);

            const sortedTrades = newTrades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
            accountsToSave[i] = { ...account, trades: sortedTrades, lastUpdated: new Date().toISOString() };
            dataWasChanged = true;
            console.log(`SW: Successfully synced "${account.name}". Found ${newlyClosed.length} new closed trades.`);

        } catch (error) {
            console.error(`SW: FAILED to sync account "${account.name}". Error:`, error.message);
        }
    }

    if (dataWasChanged) {
        console.log('SW: Sync found updates. Writing new data to IndexedDB.');
        await setDBItem('trading_accounts_v1', deepStringify(accountsToSave));
    } else {
        console.log('SW: Sync finished. No data was changed.');
    }
    console.log('SW: --- Background sync complete ---');
}


// --- EVENT LISTENERS ---
self.addEventListener('periodicsync', (e) => {
    if (e.tag === 'account-sync') {
        console.log('SW: Periodic sync event received.');
        e.waitUntil(runSync());
    }
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const urlToOpen = e.notification.data?.url || '/';
    e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        const client = clientList.find(c => c.url === urlToOpen);
        if (client) return client.focus();
        if (clients.openWindow) return clients.openWindow(urlToOpen);
    }));
});

self.addEventListener('message', (e) => {
    if (e.data?.type === 'SHOW_TEST_NOTIFICATION') {
        console.log('SW: Received request for test notification.');
        e.waitUntil(self.registration.showNotification('Atlas Test Notification', {
            body: 'If you see this, notifications are working!',
            icon: '/logo.svg',
            data: { url: `${self.location.origin}/?view=profile` },
            tag: 'atlas-test-notification'
        }));
    }
});
