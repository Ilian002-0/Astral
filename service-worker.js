const CACHE_NAME = 'atlas-cache-v11';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/logo-with-bg.svg',
  '/manifest.json',
  '/locales/en.json',
  '/locales/fr.json',
  '/dashboard-icon.svg',
  '/list-icon.svg',
  '/calendar-icon.svg',
  '/goals-icon.svg'
];

// --- IndexedDB Helpers (Duplicated from hooks/useDBStorage for standalone worker access) ---
const DB_NAME = 'atlas-db';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

let dbPromise = null;
function getDB() {
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

// --- CSV Parser (Duplicated from utils/csvParser.ts) ---
function parseCSV(content) {
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
        const cleanedValue = value.replace(/"/g, '').trim().replace(',', '.');
        return parseFloat(cleanedValue);
    };
    return lines.slice(1).map(line => {
      const separatorRegex = separator === ',' ? /,(?=(?:(?:[^"]*"){2})*[^"]*$)/ : /\t/;
      const data = line.split(separatorRegex);
      if (data.length <= Math.max(...Object.values(colMap))) return null;
      const profit = parseDecimal(data[colMap['profit']]);
      if (isNaN(profit)) return null;
      const parseMT5Date = (dateStr) => {
        if (!dateStr) return new Date();
        return new Date(dateStr.replace(/"/g, '').replace(/\./g, '-').trim());
      };
      const getCleanString = (index) => (data[index] || '').trim().replace(/"/g, '');
      return {
        ticket: parseInt(getCleanString(colMap['ticket']), 10),
        openTime: parseMT5Date(data[colMap['openTime']]),
        type: getCleanString(colMap['type']),
        size: parseDecimal(data[colMap['size']]),
        symbol: getCleanString(colMap['symbol']),
        openPrice: parseDecimal(data[colMap['openPrice']]),
        closeTime: parseMT5Date(data[colMap['closeTime']]),
        closePrice: parseDecimal(data[colMap['closePrice']]),
        commission: parseDecimal(data[colMap['commission']]),
        swap: parseDecimal(data[colMap['swap']]),
        profit: profit,
        comment: colMap['comment'] !== undefined ? getCleanString(colMap['comment']) : ''
      };
    }).filter(trade => trade !== null && !isNaN(trade.ticket) && trade.closeTime instanceof Date && !isNaN(trade.closeTime.getTime()));
}

// --- Date Helper ---
const getDayIdentifier = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// --- Notification Helpers ---
async function storeAndShowNotification(title, options) {
    const notificationHistory = await getDBItem('notification_history') || [];
    const newNotification = {
        id: new Date().toISOString(),
        title,
        body: options.body,
        timestamp: Date.now(),
        read: false,
    };
    notificationHistory.unshift(newNotification);
    await setDBItem('notification_history', notificationHistory.slice(0, 50)); // Keep last 50
    self.registration.showNotification(title, options);
}

// --- Service Worker Lifecycle ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});


// --- Periodic Sync Logic ---
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'account-sync') {
        event.waitUntil(handleSyncAndNotifications());
    }
});

async function handleSyncAndNotifications() {
    console.log('Periodic sync event fired!');
    const [settings, accounts, langCode, translations, lastSummaryTime] = await Promise.all([
        getDBItem('notification_settings') || { tradeClosed: true, weeklySummary: true },
        getDBItem('trading_accounts_v1') || [],
        getDBItem('language') || 'en',
        fetch(self.location.origin + `/locales/${await getDBItem('language') || 'en'}.json`).then(res => res.json()),
        getDBItem('last_weekly_summary') || 0
    ]);

    if (!accounts || accounts.length === 0) return;

    // --- Sync Accounts and Handle Trade Notifications ---
    const updatedAccounts = [...accounts];
    for (const account of accounts) {
        if (!account.dataUrl) continue;

        try {
            const response = await fetch(account.dataUrl, { cache: 'no-store' });
            if (!response.ok) continue;

            const csvText = await response.text();
            const newTrades = parseCSV(csvText).map(trade => ({
                ...trade,
                openTime: new Date(trade.openTime),
                closeTime: new Date(trade.closeTime),
            }));

            const oldClosedTickets = new Set(account.trades.filter(t => t.closePrice !== 0).map(t => t.ticket));
            const newClosedTrades = newTrades.filter(t => t.closePrice !== 0 && !oldClosedTickets.has(t.ticket));

            if (settings.tradeClosed && newClosedTrades.length > 0) {
                for (const trade of newClosedTrades) {
                    const netProfit = trade.profit + trade.commission + trade.swap;
                    const profitSign = netProfit >= 0 ? '+' : '';
                    const currencySymbol = account.currency === 'EUR' ? '€' : '$';
                    
                    const title = translations['notifications']['trade_closed_title'] || 'Trade Closed';
                    let body = translations['notifications']['trade_closed_body'] || `{{symbol}}: {{profit}}{{currency}}`;
                    body = body.replace('{{symbol}}', trade.symbol)
                               .replace('{{profit}}', `${profitSign}${netProfit.toFixed(2)}`)
                               .replace('{{currency}}', currencySymbol);

                    await storeAndShowNotification(title, {
                        body: body,
                        icon: '/logo-with-bg.svg',
                        tag: `trade-${trade.ticket}`
                    });
                }
            }
            
            // Update account in the array
            const accountIndex = updatedAccounts.findIndex(a => a.name === account.name);
            if (accountIndex !== -1) {
                const sortedTrades = newTrades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
                updatedAccounts[accountIndex] = { ...account, trades: sortedTrades, lastUpdated: new Date().toISOString() };
            }
        } catch (error) {
            console.error(`Failed to sync account ${account.name}:`, error);
        }
    }
    await setDBItem('trading_accounts_v1', updatedAccounts);

    // --- Handle Weekly Summary Notification ---
    if (!settings.weeklySummary) return;

    const now = new Date();
    const isSaturdayMorning = now.getDay() === 6 && now.getHours() >= 8;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (isSaturdayMorning && (now.getTime() - lastSummaryTime > oneWeek - (12 * 60 * 60 * 1000))) {
        for (const account of updatedAccounts) {
            // Calculate weekly performance
            const oneWeekAgo = new Date(now.getTime() - oneWeek);
            const tradesThisWeek = account.trades.filter(t => t.closePrice !== 0 && t.closeTime >= oneWeekAgo);

            if(tradesThisWeek.length === 0) continue;

            const profitThisWeek = tradesThisWeek.reduce((sum, t) => sum + (t.profit + t.commission + t.swap), 0);

            const tradesBeforeThisWeek = account.trades.filter(t => t.closePrice !== 0 && t.closeTime < oneWeekAgo);
            const balanceAtWeekStart = account.initialBalance + tradesBeforeThisWeek.reduce((sum, t) => sum + (t.profit + t.commission + t.swap), 0);
            const returnPercent = balanceAtWeekStart > 0 ? (profitThisWeek / balanceAtWeekStart) * 100 : 0;
            
            const profitSign = profitThisWeek >= 0 ? '+' : '';
            const currencySymbol = account.currency === 'EUR' ? '€' : '$';

            const title = translations['notifications']['weekly_summary_title'] || 'Weekly Performance Summary';
            let body = translations['notifications']['weekly_summary_body'] || `Profit: {{profit}}{{currency}} ({{return}}%)`;
            body = body.replace('{{accountName}}', account.name)
                       .replace('{{profit}}', `${profitSign}${profitThisWeek.toFixed(2)}`)
                       .replace('{{currency}}', currencySymbol)
                       .replace('{{return}}', returnPercent.toFixed(2));
            
            await storeAndShowNotification(title, {
                body,
                icon: '/logo-with-bg.svg',
                tag: `weekly-summary-${account.name}-${getDayIdentifier(now)}`
            });
        }
        await setDBItem('last_weekly_summary', now.getTime());
    }
}