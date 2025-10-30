const CACHE_NAME = 'atlas-cache-v14';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://i.imgur.com/TN8saNO.png', // Main app logo/favicon
    // PWA icons from manifest
    'https://i.imgur.com/gA2QYp9.png', // 192x192
    'https://i.imgur.com/pB3S7Lq.png', // 512x512
    'https://i.imgur.com/s4f3z2g.png', // 512x512 maskable
    'https://i.imgur.com/zW6T5bB.png', // Goals/Widget Icon
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

// --- Robust CSV Parser for Service Worker ---
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
};


// --- Service Worker Lifecycle ---

self.addEventListener('install', (event) => {
    self.skipWaiting();
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
    const url = new URL(event.request.url);

    // Handle widget-specific requests first
    if (url.pathname === '/goal-widget-template') {
        event.respondWith(handleWidgetTemplate());
        return;
    }
    if (url.pathname === '/widget-goal-data.json') {
        event.respondWith(handleWidgetData());
        return;
    }
    
    // Ignore external assets
    if (event.request.url.startsWith('https://aistudiocdn.com') || event.request.url.startsWith('https://cdn.tailwindcss.com')) {
        return; 
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
    await setDBItem('notification_history', deepStringify(history));
};

const handlePeriodicSync = async () => {
    console.log('Periodic sync event fired!');
    await fetchTranslations();
    const accountsString = await getDBItem('trading_accounts_v1');
    const settingsString = await getDBItem('notification_settings');
    const lang = await getDBItem('language').then(res => deepParse(res) || 'en');

    if (!accountsString) return;

    const accounts = deepParse(accountsString) || [];
    const settings = deepParse(settingsString) || { tradeClosed: true, weeklySummary: true };
    let hasUpdates = false;

    for (const account of accounts) {
        if (!account.dataUrl) continue;
        
        try {
            const response = await fetch(account.dataUrl, { cache: 'no-store' });
            if (!response.ok) {
                console.error(`Failed to fetch for ${account.name}: ${response.status}`);
                continue;
            }
            const csvText = await response.text();
            
            const allFetchedTrades = parseCSV_SW(csvText);
            if (allFetchedTrades.length === 0) continue;
            
            const existingTickets = new Set(account.trades.map(t => t.ticket));
            const newlyClosedTrades = allFetchedTrades.filter(
                t => t.closePrice !== 0 && !existingTickets.has(t.ticket)
            );

            if (settings.tradeClosed && newlyClosedTrades.length > 0) {
                 console.log(`Found ${newlyClosedTrades.length} new trades for ${account.name}`);
                 for (const trade of newlyClosedTrades) {
                    const currencySymbol = account.currency === 'EUR' ? '€' : '$';
                    const title = t(lang, 'notifications.trade_closed_title');
                    const body = t(lang, 'notifications.trade_closed_body', {
                        symbol: trade.symbol,
                        profit: trade.profit.toFixed(2),
                        currency: currencySymbol
                    });
                     const notificationItem = { id: `trade-${Date.now()}-${trade.ticket}`, title, body, timestamp: Date.now(), read: false };
                    showNotification(title, { body, tag: `trade-${trade.ticket}` });
                    await saveNotificationToHistory(notificationItem);
                 }
            }

            // Merge trades and update account data if new trades were found
            if (newlyClosedTrades.length > 0) {
                const tradesMap = new Map(account.trades.map(t => [t.ticket, t]));
                allFetchedTrades.forEach(t => tradesMap.set(t.ticket, t));
                
                account.trades = Array.from(tradesMap.values()).sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
                account.lastUpdated = new Date().toISOString();
                hasUpdates = true;
            }

        } catch (e) {
            console.error('Error during background sync for account:', account.name, e);
        }
    }

    if (hasUpdates) {
        console.log('Updating accounts in IndexedDB after sync.');
        await setDBItem('trading_accounts_v1', deepStringify(accounts));
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

// --- PWA WIDGETS ---

const GOAL_WIDGET_TEMPLATE = {
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "${goalTitle}",
      "size": "Medium",
      "weight": "Bolder",
      "horizontalAlignment": "Center"
    },
    {
      "type": "TextBlock",
      "text": "${progressText}",
      "size": "ExtraLarge",
      "weight": "Bolder",
      "horizontalAlignment": "Center",
      "color": "${progressColor}"
    },
    {
      "type": "TextBlock",
      "text": "Current: ${currentValue}",
      "horizontalAlignment": "Center",
      "spacing": "None"
    },
    {
      "type": "TextBlock",
      "text": "Target: ${targetValue}",
      "horizontalAlignment": "Center",
      "spacing": "None"
    }
  ]
};

function handleWidgetTemplate() {
    return new Response(JSON.stringify(GOAL_WIDGET_TEMPLATE), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleWidgetData() {
    try {
        const currentAccountNameStr = await getDBItem('current_account_v1');
        const accountsStr = await getDBItem('trading_accounts_v1');
        
        const currentAccountName = deepParse(currentAccountNameStr);
        const accounts = deepParse(accountsStr);

        if (!currentAccountName || !accounts || accounts.length === 0) {
            return new Response(JSON.stringify({ goalTitle: "No Account Selected" }), { headers: { 'Content-Type': 'application/json' } });
        }
        
        const currentAccount = accounts.find(acc => acc.name === currentAccountName);
        if (!currentAccount) {
            return new Response(JSON.stringify({ goalTitle: "Account Not Found" }), { headers: { 'Content-Type': 'application/json' } });
        }
        
        const goal = currentAccount.goals?.netProfit;
        if (!goal || !goal.enabled) {
            return new Response(JSON.stringify({ 
                goalTitle: "Goal Not Set",
                progressText: "🎯",
                currentValue: "N/A",
                targetValue: "N/A",
                progressColor: "Default"
            }), { headers: { 'Content-Type': 'application/json' } });
        }
        
        // Simplified metric calculation for SW context
        const closedTrades = currentAccount.trades.filter(op => op.type !== 'balance');
        const netProfit = closedTrades.reduce((sum, t) => sum + t.profit + t.commission + t.swap, 0);

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
        console.error('Error generating widget data:', error);
        return new Response(JSON.stringify({ goalTitle: "Error" }), { status: 500 });
    }
}
