importScripts('https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js');

// --- CONSTANTS & CONFIG ---
const CACHE_NAME = 'atlas-cache-v32'; // Incremented cache version
const ASSETS_TO_CACHE = [
    './', // Keep root
    'index.html', 'manifest.json', 'logo.svg',
    'dashboard-icon.svg', 'list-icon.svg', 'calendar-icon.svg', 'goals-icon.svg',
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
                console.error('SW DB Error:', e);
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

// --- PACKING UTILITIES (Inlined for SW) ---
const packTrade = (trade) => [
    trade.ticket, trade.openTime.getTime(), trade.type, trade.size, trade.symbol,
    trade.openPrice, trade.closeTime.getTime(), trade.closePrice, trade.commission,
    trade.swap, trade.profit, trade.comment || ''
];

const unpackTrade = (row) => ({
    ticket: row[0], openTime: new Date(row[1]), type: row[2], size: row[3],
    symbol: row[4], openPrice: row[5], closeTime: new Date(row[6]),
    closePrice: row[7], commission: row[8], swap: row[9], profit: row[10],
    comment: row[11]
});

const packAccounts = (accounts) => accounts.map(account => ({
    ...account,
    isPacked: true,
    packedTrades: account.trades.map(packTrade),
    trades: undefined // Remove expanded trades
}));

const unpackAccounts = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
        if (!item.isPacked && item.trades) return item; // Already unpacked
        if (item.isPacked && item.packedTrades) {
            return {
                ...item,
                trades: item.packedTrades.map(unpackTrade),
                packedTrades: undefined
            };
        }
        return item;
    });
};

// --- SMART PARSE (Handles Compressed, Packed & Legacy Data) ---
const smartParse = (raw, isAccountsKey = false) => {
    if (!raw) return null;
    let parsed = null;
    
    const decompressed = LZString.decompressFromUTF16(raw);
    if (decompressed) {
        try { parsed = deepParse(decompressed); } catch (e) {}
    } else {
        try { parsed = deepParse(raw); } catch (e) {}
    }

    if (isAccountsKey && parsed && Array.isArray(parsed)) {
        return unpackAccounts(parsed);
    }
    return parsed;
};


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
        return !isNaN(trade.ticket) &&
               trade.openTime instanceof Date && !isNaN(trade.openTime.getTime()) && trade.openTime.getTime() !== 0 &&
               trade.closeTime instanceof Date && !isNaN(trade.closeTime.getTime());
    });
};


// --- SERVICE WORKER LIFECYCLE ---
self.addEventListener('install', (e) => {
    console.log('SW: Installing...');
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('activate', (e) => {
    console.log('SW: Activating...');
    e.waitUntil(
        caches.keys().then((names) => Promise.all(names.map((n) => n !== CACHE_NAME && caches.delete(n))))
        .then(() => self.clients.claim())
        .then(() => { console.log('SW: Activated. Running initial sync.'); return runSync(); })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request).then(res => res || new Response(null, { status: 404 })))
    );
});


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
        // Try to find an already open client and focus it.
        for (const client of clientList) {
            // new URL(client.url).pathname strips any query params for a more reliable match
            if (new URL(client.url).pathname === new URL(urlToOpen, self.location.origin).pathname && 'focus' in client) {
                return client.focus();
            }
        }
        // If no client is open, open a new window.
        if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
        }
    }));
});

// Handle messages from the client (e.g., to show a test notification)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_TEST_NOTIFICATION') {
        const { title, body } = event.data.payload;
        event.waitUntil(
            self.registration.showNotification(title, {
                body: body,
                icon: 'logo.svg',
                tag: 'atlas-test-notification' // Use a tag to prevent multiple test notifications from stacking
            })
        );
    }
});


// --- NOTIFICATION & SYNC LOGIC ---
const translations = {
  en: {
    "notifications": { "trade_closed_title": "Trade Closed", "trade_closed_body": "{{symbol}}: {{profit}}{{currency}}", "weekly_summary_title": "Weekly Performance Summary", "weekly_summary_body": "{{accountName}} | Profit: {{profit}}{{currency}} ({{return}}%)" },
  },
  fr: {
    "notifications": { "trade_closed_title": "Trade Clôturé", "trade_closed_body": "{{symbol}}: {{profit}}{{currency}}", "weekly_summary_title": "Résumé Hebdomadaire des Performances", "weekly_summary_body": "{{accountName}} | Profit: {{profit}}{{currency}} ({{return}}%)" },
  }
};

const t = (lang, key, opts) => {
    let str = key.split('.').reduce((o, i) => o?.[i], translations[lang === 'fr' ? 'fr' : 'en']) || key;
    if (opts) Object.entries(opts).forEach(([k, v]) => str = str.replace(`{{${k}}}`, v));
    return str;
};

// **CRITICAL FIX:** This function now correctly identifies newly closed trades.
const findNewlyClosedTrades = (newTrades, oldTrades) => {
    const oldTradesMap = new Map(oldTrades.map(t => [t.ticket, t]));
    
    return newTrades.filter(newTrade => {
        // We only care about actual trades that are now closed.
        if (newTrade.type === 'balance' || newTrade.closePrice === 0) {
            return false;
        }
        
        const oldTrade = oldTradesMap.get(newTrade.ticket);
        
        // A trade is "newly closed" if:
        // 1. It didn't exist before (it's a brand new, already closed trade).
        // 2. Or, it existed before, but it was open (old closePrice was 0).
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
        self.registration.showNotification(title, { body, tag: `trade-${trade.ticket}`, icon: 'logo.svg', data: { url: `${self.location.origin}/?view=trades` } });
    });
};

// **NEW:** A robust function to sync a single account.
async function syncAccount(account, lang, settings) {
    if (!account.dataUrl) {
        return { account, hasChanged: false };
    }

    try {
        const response = await fetch(account.dataUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
        
        const csvText = await response.text();
        const newTrades = parseCSV_SW(csvText);
        
        if (newTrades.length === 0 && account.trades.length > 0) {
            return { account, hasChanged: false };
        }

        const newlyClosed = findNewlyClosedTrades(newTrades, account.trades);
        notifyForTrades(newlyClosed, account, lang, settings);

        const sortedTrades = newTrades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
        const updatedAccount = { ...account, trades: sortedTrades, lastUpdated: new Date().toISOString() };
        
        return { account: updatedAccount, hasChanged: true };

    } catch (error) {
        console.error(`SW: FAILED to sync account "${account.name}". Error:`, error.message);
        return { account, hasChanged: false }; // Return original account on failure
    }
}

// **REFACTORED:** The main sync logic is now more resilient and handles compressed data.
async function runSync() {
    try {
        console.log('SW: --- Starting background sync ---');
        
        const [accountsRaw, settingsRaw, langRaw] = await Promise.all([
            getDBItem('trading_accounts_v1'),
            getDBItem('notification_settings'),
            getDBItem('language'), 
        ]);
        
        let lang = 'en';
        const parsedLang = smartParse(langRaw);
        if (parsedLang && (parsedLang === 'fr' || parsedLang === 'en')) {
            lang = parsedLang;
        }

        const originalAccounts = smartParse(accountsRaw, true) || []; // Pass true to unpack trades
        if (!originalAccounts.length) {
            console.log('SW: No accounts configured. Sync finished.');
            return;
        }
        const settings = smartParse(settingsRaw) || { tradeClosed: true, weeklySummary: true };
        
        const syncPromises = originalAccounts.map(acc => syncAccount(acc, lang, settings));
        const results = await Promise.all(syncPromises);

        const updatedAccounts = results.map(r => r.account);
        const wasAnyDataChanged = results.some(r => r.hasChanged);

        if (wasAnyDataChanged) {
            console.log('SW: Sync found updates. Packing, Compressing and writing new data to IndexedDB.');
            // Pack accounts before stringifying
            const packedAccounts = packAccounts(updatedAccounts);
            const str = deepStringify(packedAccounts);
            const compressed = LZString.compressToUTF16(str);
            await setDBItem('trading_accounts_v1', compressed);
        } else {
            console.log('SW: Sync finished. No data was changed.');
        }
    } catch (error) {
        console.error('SW: A critical error occurred during runSync:', error);
    } finally {
        console.log('SW: --- Background sync complete ---');
    }
}