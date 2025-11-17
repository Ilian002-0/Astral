


const CACHE_NAME = 'atlas-cache-v22'; // Incremented cache version
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/logo.svg',
    // Shortcut icons from manifest
    '/dashboard-icon.svg',
    '/list-icon.svg',
    '/calendar-icon.svg',
    '/goals-icon.svg',
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

// --- Date Reviver & Stringifier for JSON Serialization ---
const dateReviver = (key, value) => {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (typeof value === 'string' && isoDateRegex.test(value)) {
    return new Date(value);
  }
  return value;
};
const dateReplacer = (key, value) => {
    if (value instanceof Date) {
        return value.toISOString();
    }
    return value;
};
const deepParse = (jsonString) => {
    if (!jsonString) return null;
    return JSON.parse(jsonString, dateReviver);
};
const deepStringify = (obj) => {
    return JSON.stringify(obj, dateReplacer);
};

// --- Robust CSV Parser (aligned with main app) ---
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
        const cleanedValue = value.replace(/"/g, '').trim().replace(',', '.');
        return parseFloat(cleanedValue);
    };

    return lines.slice(1).map(line => {
      const separatorRegex = separator === ',' ? /,(?=(?:(?:[^"]*"){2})*[^"]*$)/ : /\t/;
      const data = line.split(separatorRegex);
      
      if (data.length <= Math.max(...Object.values(colMap))) return null;
      
      const getCleanString = (index) => (data[index] || '').trim().replace(/"/g, '');
      const type = getCleanString(colMap['type']);
      const profit = parseDecimal(data[colMap['profit']]);
      
      const parseMT5Date = (dateStr) => {
        if (!dateStr || dateStr.trim() === '') return new Date(0); // Return epoch for invalid dates
        return new Date(dateStr.replace(/"/g, '').replace(/\./g, '-').trim());
      };

      if (type === 'balance') {
        const opTime = parseMT5Date(data[colMap['openTime']]);
        if (isNaN(opTime.getTime()) || opTime.getTime() === 0) return null;

        return {
          ticket: parseInt(getCleanString(colMap['ticket']), 10) || opTime.getTime(),
          openTime: opTime,
          type: 'balance',
          size: 0,
          symbol: 'Balance',
          openPrice: 0,
          closeTime: opTime,
          closePrice: 1,
          commission: 0,
          swap: 0,
          profit: profit,
          comment: getCleanString(colMap['comment']) || (profit > 0 ? 'Deposit' : 'Withdrawal')
        };
      }

      if (isNaN(profit)) return null;

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
    }).filter(trade => trade !== null && !isNaN(trade.ticket) && trade.openTime instanceof Date && !isNaN(trade.openTime.getTime()) && trade.openTime.getTime() !== 0 && trade.closeTime instanceof Date && !isNaN(trade.closeTime.getTime()) && trade.closeTime.getTime() !== 0);
  };


// --- Service Worker Lifecycle ---

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Caching app shell');
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
                        console.log('SW: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
        .then(() => {
            console.log('SW: Activated. Running initial sync check.');
            return handlePeriodicSync(); // Run on activation
        })
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.url.startsWith('http') && !request.url.startsWith(self.origin) || url.pathname.includes('browser-sync')) {
        return;
    }
    
    if (url.pathname === '/goal-widget-template') {
        event.respondWith(handleWidgetTemplate());
        return;
    }
    if (url.pathname === '/widget-goal-data.json') {
        event.respondWith(handleWidgetData());
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
                return response;
            })
            .catch(() => caches.match(request))
    );
});


// --- Background Sync & Notifications ---

let translations = {};
const fetchTranslations = async () => {
    try {
        if (Object.keys(translations).length > 0) return;
        const enRes = await fetch('/locales/en.json');
        const frRes = await fetch('/locales/fr.json');
        translations['en'] = await enRes.json();
        translations['fr'] = await frRes.json();
        console.log('SW: Translations loaded.');
    } catch (e) {
        console.error('SW: Failed to fetch translations for notifications', e);
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

const findNewlyClosedTrades = (newTrades, oldTrades) => {
    const oldTradesMap = new Map(oldTrades.map(t => [t.ticket, t]));
    return newTrades.filter(newTrade => {
        if (newTrade.type === 'balance' || newTrade.closePrice === 0) {
            return false;
        }
        const oldTrade = oldTradesMap.get(newTrade.ticket);
        // It's "newly closed" if it didn't exist before, or if it existed but was open.
        return !oldTrade || oldTrade.closePrice === 0;
    });
};

const notifyForTrades = (trades, account, lang, settings) => {
    if (!settings.tradeClosed || trades.length === 0) {
        return;
    }
    console.log(`SW: Found ${trades.length} new trades for ${account.name}. Sending notifications.`);
    for (const trade of trades) {
        const currencySymbol = account.currency === 'EUR' ? '€' : '$';
        const title = t(lang, 'notifications.trade_closed_title');
        const body = t(lang, 'notifications.trade_closed_body', {
            symbol: trade.symbol,
            profit: trade.profit.toFixed(2),
            currency: currencySymbol
        });
        self.registration.showNotification(title, {
            body,
            tag: `trade-${trade.ticket}`,
            icon: '/logo.svg',
            badge: '/logo.svg',
            data: { url: `${self.location.origin}/?view=trades` }
        });
    }
};

const syncAccount = async (account, settings, lang) => {
    if (!account.dataUrl) return null;

    try {
        console.log(`SW: Syncing account: ${account.name}`);
        const response = await fetch(account.dataUrl, { cache: 'no-store' });
        if (!response.ok) {
            console.error(`SW: Failed to fetch for ${account.name}: ${response.status}`);
            return null;
        }
        const csvText = await response.text();
        const newTrades = parseCSV_SW(csvText);
        if (newTrades.length === 0) {
            console.log(`SW: No trades found in fetched file for ${account.name}.`);
            return null;
        }

        const newlyClosed = findNewlyClosedTrades(newTrades, account.trades);
        notifyForTrades(newlyClosed, account, lang, settings);

        // If there are any changes, prepare the updated account data.
        if (newlyClosed.length > 0) {
            const tradesMap = new Map(account.trades.map(t => [t.ticket, t]));
            newTrades.forEach(t => tradesMap.set(t.ticket, t));
            const sortedTrades = Array.from(tradesMap.values()).sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
            return { ...account, trades: sortedTrades, lastUpdated: new Date().toISOString() };
        }
        return null; // No updates
    } catch (e) {
        console.error(`SW: Error during sync for account "${account.name}":`, e);
        return null;
    }
};

const handlePeriodicSync = async () => {
    console.log('SW: periodic sync event fired!');
    await fetchTranslations();

    const accountsString = await getDBItem('trading_accounts_v1');
    const settingsString = await getDBItem('notification_settings');
    const lang = await getDBItem('language').then(val => deepParse(val) || 'en');
    
    const accounts = deepParse(accountsString) || [];
    if (accounts.length === 0) {
        console.log('SW: No accounts to sync.');
        return;
    }
    const settings = deepParse(settingsString) || { tradeClosed: true, weeklySummary: true };

    const syncPromises = accounts.map(acc => syncAccount(acc, settings, lang));
    const updatedAccountsData = await Promise.all(syncPromises);

    let hasUpdates = false;
    const finalAccounts = accounts.map((originalAccount, index) => {
        const updatedVersion = updatedAccountsData[index];
        if (updatedVersion) {
            hasUpdates = true;
            return updatedVersion;
        }
        return originalAccount;
    });

    if (hasUpdates) {
        console.log('SW: Sync found updates. Saving new account data to IndexedDB.');
        await setDBItem('trading_accounts_v1', deepStringify(finalAccounts));
    } else {
        console.log('SW: Sync finished, no new data found.');
    }
};

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'account-sync') {
        event.waitUntil(handlePeriodicSync());
    }
});

self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    notification.close();
    
    const urlToOpen = new URL(notification.data?.url || '/', self.location.origin).href;

    event.waitUntil(clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((clientList) => {
        for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
                return client.focus();
            }
        }
        if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
        }
    }));
});

self.addEventListener('message', event => {
    if (!event.data) return;
    if (event.data.type === 'SHOW_TEST_NOTIFICATION') {
        console.log('SW: Received request for test notification.');
        event.waitUntil(
            self.registration.showNotification('Atlas Test Notification', {
                body: 'If you see this, notifications are working! Click me.',
                icon: '/logo.svg',
                badge: '/logo.svg',
                data: { url: `${self.location.origin}/?view=profile` },
                tag: 'atlas-test-notification'
            })
        );
    }
});

// --- PWA WIDGETS ---

const GOAL_WIDGET_TEMPLATE = {
  "type": "AdaptiveCard", "version": "1.5", "body": [{"type": "TextBlock","text": "${goalTitle}","size": "Medium","weight": "Bolder","horizontalAlignment": "Center"},{"type": "TextBlock","text": "${progressText}","size": "ExtraLarge","weight": "Bolder","horizontalAlignment": "Center","color": "${progressColor}"},{"type": "TextBlock","text": "Current: ${currentValue}","horizontalAlignment": "Center","spacing": "None"},{"type": "TextBlock","text": "Target: ${targetValue}","horizontalAlignment": "Center","spacing": "None"}]
};

function handleWidgetTemplate() {
    return new Response(JSON.stringify(GOAL_WIDGET_TEMPLATE), { headers: { 'Content-Type': 'application/json' } });
}

async function handleWidgetData() {
    try {
        const [currentAccountNameStr, accountsStr] = await Promise.all([getDBItem('current_account_v1'), getDBItem('trading_accounts_v1')]);
        const currentAccountName = deepParse(currentAccountNameStr);
        const accounts = deepParse(accountsStr);

        if (!currentAccountName || !Array.isArray(accounts) || accounts.length === 0) {
            return new Response(JSON.stringify({ goalTitle: "No Account Selected" }), { headers: { 'Content-Type': 'application/json' } });
        }
        const currentAccount = accounts.find(acc => acc.name === currentAccountName);
        if (!currentAccount) {
            return new Response(JSON.stringify({ goalTitle: "Account Not Found" }), { headers: { 'Content-Type': 'application/json' } });
        }
        const goal = currentAccount.goals?.netProfit;
        if (!goal || !goal.enabled) {
            return new Response(JSON.stringify({ goalTitle: "Goal Not Set", progressText: "🎯", currentValue: "N/A", targetValue: "N/A", progressColor: "Default"}), { headers: { 'Content-Type': 'application/json' } });
        }
        
        const netProfit = currentAccount.trades.filter(op => op.type !== 'balance').reduce((sum, t) => sum + t.profit + t.commission + t.swap, 0);
        const isMet = netProfit >= goal.target;
        const progress = goal.target > 0 ? (netProfit / goal.target) * 100 : (netProfit > 0 ? 100 : 0);
        const currencySymbol = currentAccount.currency === 'EUR' ? '€' : '$';
        
        const data = {
            goalTitle: `Net Profit Goal`,
            progressText: isMet ? "🎉 Met!" : `${Math.min(100, progress).toFixed(0)}%`,
            currentValue: `${netProfit.toFixed(2)}${currencySymbol}`,
            targetValue: `${goal.target.toFixed(2)}${currencySymbol}`,
            progressColor: isMet ? "Good" : "Accent"
        };
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('SW: Error generating widget data:', error);
        return new Response(JSON.stringify({ goalTitle: "Error" }), { status: 500 });
    }
}
