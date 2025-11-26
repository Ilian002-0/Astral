
import { useState, useCallback, useRef, useEffect } from 'react';
import { Account } from '../types';
import { parseCSV } from '../utils/csvParser';
import { useLanguage } from '../contexts/LanguageContext';

export const useSync = (
    accounts: Account[], 
    updateAccountTrades: (name: string, trades: any[]) => void
) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isSyncingRef = useRef(isSyncing);
    const hasRunInitialSync = useRef(false);
    const { t } = useLanguage();

    isSyncingRef.current = isSyncing;

    const refreshAccount = useCallback(async (accountToSync: Account) => {
        if (!accountToSync.dataUrl || isSyncingRef.current) return;
        
        setIsSyncing(true);
        setError(null);
        
        try {
            const response = await fetch(accountToSync.dataUrl, { cache: 'reload' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const csvText = await response.text();
            const newTrades = parseCSV(csvText);
            
            updateAccountTrades(accountToSync.name, newTrades);
        } catch (err) {
            console.error(err);
            if (!navigator.onLine) setError(t('errors.offline'));
            else setError(t('errors.fetch_failed'));
        } finally {
            setIsSyncing(false);
        }
    }, [t, updateAccountTrades]);

    // Initial Sync Effect
    useEffect(() => {
        if (hasRunInitialSync.current || accounts.length === 0) return;
        
        const syncAll = async () => {
            const accountsToSync = accounts.filter(acc => acc.dataUrl);
            if (accountsToSync.length > 0) {
                // Prevent duplicate syncs if accounts are still loading but exists
                 hasRunInitialSync.current = true;
                await Promise.all(accountsToSync.map(acc => refreshAccount(acc)));
            }
        };
        
        syncAll();
    }, [accounts, refreshAccount]);

    return {
        isSyncing,
        syncError: error,
        refreshAccount,
        setSyncError: setError
    };
};
