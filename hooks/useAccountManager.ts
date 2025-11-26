
import { useMemo, useCallback } from 'react';
import useDBStorage from './useLocalStorage';
import { Account, Trade, Goals } from '../types';
import { triggerHaptic } from '../utils/haptics';

export const useAccountManager = () => {
    const { data: accounts, setData: setAccounts, isLoading: isLoadingAccounts } = useDBStorage<Account[]>('trading_accounts_v1', []);
    const { data: currentAccountName, setData: setCurrentAccountName, isLoading: isLoadingCurrentAccount } = useDBStorage<string | null>('current_account_v1', null);

    const isLoading = isLoadingAccounts || isLoadingCurrentAccount;

    // Derived state: Current Account Object
    const currentAccount = useMemo(() => {
        if (isLoading) return null;
        return accounts.find(acc => acc.name === currentAccountName) || null;
    }, [accounts, currentAccountName, isLoading]);

    // Initialize default account if needed
    useMemo(() => {
        if (isLoading) return;
        const accountExists = accounts.some(acc => acc.name === currentAccountName);
        if (!currentAccountName && accounts.length > 0) {
            setCurrentAccountName(accounts[0].name);
        } else if (currentAccountName && !accountExists && accounts.length > 0) {
            setCurrentAccountName(accounts[0].name);
        } else if (accounts.length === 0) {
            setCurrentAccountName(null);
        }
    }, [accounts, currentAccountName, setCurrentAccountName, isLoading]);

    // Actions
    const saveAccount = useCallback((
        accountData: { name: string; trades: Trade[]; initialBalance: number; currency: 'USD' | 'EUR', dataUrl?: string }, 
        mode: 'add' | 'update'
    ) => {
        let error: string | null = null;
        
        setAccounts(prevAccounts => {
            if (mode === 'add') {
                if (prevAccounts.some(acc => acc.name === accountData.name)) {
                    error = `An account with the name "${accountData.name}" already exists.`;
                    return prevAccounts;
                }
                const sortedTrades = accountData.trades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
                const newAccount: Account = { ...accountData, trades: sortedTrades, goals: {}, lastUpdated: new Date().toISOString() };
                const newAccounts = [...prevAccounts, newAccount];
                setCurrentAccountName(newAccount.name);
                triggerHaptic('success');
                return newAccounts;
            } else { // 'update'
                triggerHaptic('success');
                return prevAccounts.map(acc => {
                    if (acc.name === accountData.name) {
                        let updatedTrades = acc.trades;
                        // If trades were passed, it's a file update, so merge them.
                        if (accountData.trades.length > 0) {
                            const tradesMap = new Map(acc.trades.map(t => [t.ticket, t]));
                            accountData.trades.forEach(t => tradesMap.set(t.ticket, t));
                            updatedTrades = Array.from(tradesMap.values()).sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
                        }
                        return { ...acc, ...accountData, trades: updatedTrades, lastUpdated: new Date().toISOString() };
                    }
                    return acc;
                });
            }
        });

        if (error) throw new Error(error);
    }, [setAccounts, setCurrentAccountName]);

    const deleteAccount = useCallback(() => {
        if (!currentAccountName) return;
        setAccounts(prev => prev.filter(acc => acc.name !== currentAccountName));
        triggerHaptic('heavy');
    }, [currentAccountName, setAccounts]);

    const saveGoals = useCallback((goals: Goals) => {
        if (!currentAccountName) return;
        setAccounts(prev => prev.map(acc => acc.name === currentAccountName ? { ...acc, goals } : acc));
        triggerHaptic('success');
    }, [currentAccountName, setAccounts]);

    // Helper to update trades directly (used by Sync service)
    const updateAccountTrades = useCallback((accountName: string, newTrades: Trade[]) => {
        setAccounts(prevAccounts => 
            prevAccounts.map(acc => {
                if (acc.name === accountName) {
                    const sortedTrades = newTrades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
                    return { ...acc, trades: sortedTrades, lastUpdated: new Date().toISOString() };
                }
                return acc;
            })
        );
    }, [setAccounts]);

    return {
        accounts,
        currentAccount,
        currentAccountName,
        setCurrentAccountName,
        isLoading,
        saveAccount,
        deleteAccount,
        saveGoals,
        updateAccountTrades
    };
};
