
import { Account, Trade, Goals } from '../types';

// Define the order of keys for the packed array to ensure consistency
const TRADE_KEYS: (keyof Trade)[] = [
    'ticket', 
    'openTime', 
    'type', 
    'size', 
    'symbol', 
    'openPrice', 
    'closeTime', 
    'closePrice', 
    'commission', 
    'swap', 
    'profit', 
    'comment'
];

// Type definition for a packed trade (array of values)
export type PackedTrade = (number | string)[];

export interface PackedAccount {
    name: string;
    packedTrades: PackedTrade[];
    initialBalance: number;
    currency?: 'USD' | 'EUR';
    goals?: Goals;
    dataUrl?: string;
    lastUpdated?: string;
    isPacked: true; // Flag to identify packed data
}

/**
 * Converts a Trade object to a compact array.
 * Dates are converted to timestamps (number) to save space (no quotes).
 */
const packTrade = (trade: Trade): PackedTrade => {
    return [
        trade.ticket,
        trade.openTime.getTime(),
        trade.type,
        trade.size,
        trade.symbol,
        trade.openPrice,
        trade.closeTime.getTime(),
        trade.closePrice,
        trade.commission,
        trade.swap,
        trade.profit,
        trade.comment || ''
    ];
};

/**
 * Converts a compact array back to a Trade object.
 */
const unpackTrade = (row: PackedTrade): Trade => {
    return {
        ticket: row[0] as number,
        openTime: new Date(row[1] as number),
        type: row[2] as string,
        size: row[3] as number,
        symbol: row[4] as string,
        openPrice: row[5] as number,
        closeTime: new Date(row[6] as number),
        closePrice: row[7] as number,
        commission: row[8] as number,
        swap: row[9] as number,
        profit: row[10] as number,
        comment: row[11] as string
    };
};

/**
 * Packs an array of Accounts into an optimized structure.
 */
export const packAccounts = (accounts: Account[]): PackedAccount[] => {
    return accounts.map(account => ({
        name: account.name,
        initialBalance: account.initialBalance,
        currency: account.currency,
        goals: account.goals,
        dataUrl: account.dataUrl,
        lastUpdated: account.lastUpdated,
        isPacked: true,
        packedTrades: account.trades.map(packTrade)
    }));
};

/**
 * Unpacks the optimized structure back to standard Account objects.
 * Handles mixed data (legacy unpacked objects) gracefully.
 */
export const unpackAccounts = (data: any[]): Account[] => {
    if (!Array.isArray(data)) return [];

    return data.map(item => {
        // If it's already a standard Account (legacy data), return as is
        if (!item.isPacked && item.trades) {
            // Ensure dates are Dates (parsing JSON might have left them as strings if not handled by reviver)
            const trades = item.trades.map((t: any) => ({
                ...t,
                openTime: typeof t.openTime === 'string' ? new Date(t.openTime) : t.openTime,
                closeTime: typeof t.closeTime === 'string' ? new Date(t.closeTime) : t.closeTime,
            }));
            return { ...item, trades };
        }

        // If it's a PackedAccount
        if (item.isPacked && item.packedTrades) {
            return {
                name: item.name,
                initialBalance: item.initialBalance,
                currency: item.currency,
                goals: item.goals,
                dataUrl: item.dataUrl,
                lastUpdated: item.lastUpdated,
                trades: item.packedTrades.map(unpackTrade)
            };
        }

        return item;
    });
};
