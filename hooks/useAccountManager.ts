
import { useMemo, useCallback, useEffect } from 'react';
import useDBStorage from './useLocalStorage';
import { Account, Trade, Goals } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Define what we actually save to Firestore (Minimal data)
interface FirestoreAccount {
    name: string;
    initialBalance: number;
    currency?: 'USD' | 'EUR';
    dataUrl?: string; // Critical for sync
    goals?: Goals;
    lastUpdated: string;
    activeStrategyIds?: string[];
}

export const useAccountManager = () => {
    // Local storage (fallback / cache)
    const { data: localAccounts, setData: setLocalAccounts, isLoading: isLoadingLocal } = useDBStorage<Account[]>('trading_accounts_v1', []);
    const { data: currentAccountName, setData: setCurrentAccountName, isLoading: isLoadingCurrentAccount } = useDBStorage<string | null>('current_account_v1', null);
    
    const { user } = useAuth();
    
    // If user is logged in, listen to Firestore. 
    useEffect(() => {
        if (!user) return;

        const userDocRef = doc(db, 'users', user.uid);
        
        const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                const remoteAccounts = (data.accounts || []) as FirestoreAccount[];

                // Merge remote config with local trades
                setLocalAccounts(prevLocal => {
                    const merged = remoteAccounts.map(remoteAcc => {
                        const localMatch = prevLocal.find(l => l.name === remoteAcc.name);
                        
                        return {
                            ...remoteAcc,
                            trades: localMatch ? localMatch.trades : [] 
                        };
                    });
                    
                    return merged;
                });
            }
        });

        return () => unsubscribe();
    }, [user, setLocalAccounts]);

    const accounts = localAccounts;
    const isLoading = isLoadingLocal || isLoadingCurrentAccount;

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

    // Helper to push updates to Firestore
    const pushToFirestore = async (newAccounts: Account[]) => {
        if (!user) return;
        
        // Strip trades before saving to Firestore to save space
        const minimizedAccounts: FirestoreAccount[] = newAccounts.map(acc => ({
            name: acc.name,
            initialBalance: acc.initialBalance,
            currency: acc.currency,
            dataUrl: acc.dataUrl,
            goals: acc.goals,
            lastUpdated: acc.lastUpdated || new Date().toISOString(),
            activeStrategyIds: acc.activeStrategyIds
        }));

        try {
            await setDoc(doc(db, 'users', user.uid), { accounts: minimizedAccounts }, { merge: true });
        } catch (e) {
            console.error("Failed to sync to Firestore", e);
        }
    };

    // Actions
    const saveAccount = useCallback((
        accountData: { name: string; trades: Trade[]; initialBalance: number; currency: 'USD' | 'EUR', dataUrl?: string }, 
        mode: 'add' | 'update'
    ) => {
        let error: string | null = null;
        
        setLocalAccounts(prevAccounts => {
            let newAccountsList = [...prevAccounts];

            if (mode === 'add') {
                if (prevAccounts.some(acc => acc.name === accountData.name)) {
                    error = `An account with the name "${accountData.name}" already exists.`;
                    return prevAccounts;
                }
                const sortedTrades = accountData.trades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
                // New accounts start with NO strategies linked (user must import explicitly)
                const newAccount: Account = { 
                    ...accountData, 
                    trades: sortedTrades, 
                    goals: {}, 
                    lastUpdated: new Date().toISOString(),
                    activeStrategyIds: [] 
                };
                newAccountsList = [...prevAccounts, newAccount];
                setCurrentAccountName(newAccount.name);
                triggerHaptic('success');
            } else { // 'update'
                triggerHaptic('success');
                newAccountsList = prevAccounts.map(acc => {
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
            
            // Sync with Firestore
            if (user) {
                pushToFirestore(newAccountsList);
            }
            return newAccountsList;
        });

        if (error) throw new Error(error);
    }, [setLocalAccounts, setCurrentAccountName, user]);

    const deleteAccount = useCallback(() => {
        if (!currentAccountName) return;
        setLocalAccounts(prev => {
            const newList = prev.filter(acc => acc.name !== currentAccountName);
            if (user) pushToFirestore(newList);
            return newList;
        });
        triggerHaptic('heavy');
    }, [currentAccountName, setLocalAccounts, user]);

    const saveGoals = useCallback((goals: Goals) => {
        if (!currentAccountName) return;
        setLocalAccounts(prev => {
            const newList = prev.map(acc => acc.name === currentAccountName ? { ...acc, goals } : acc);
            if (user) pushToFirestore(newList);
            return newList;
        });
        triggerHaptic('success');
    }, [currentAccountName, setLocalAccounts, user]);

    const updateAccountTrades = useCallback((accountName: string, newTrades: Trade[]) => {
        setLocalAccounts(prevAccounts => 
            prevAccounts.map(acc => {
                if (acc.name === accountName) {
                    const sortedTrades = newTrades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
                    return { ...acc, trades: sortedTrades, lastUpdated: new Date().toISOString() };
                }
                return acc;
            })
        );
    }, [setLocalAccounts]);

    // Strategy Linking
    const linkStrategyToAccount = useCallback((strategyId: string) => {
        if (!currentAccountName) return;
        setLocalAccounts(prev => {
            const newList = prev.map(acc => {
                if (acc.name === currentAccountName) {
                    const ids = new Set(acc.activeStrategyIds || []);
                    ids.add(strategyId);
                    return { ...acc, activeStrategyIds: Array.from(ids) };
                }
                return acc;
            });
            if (user) pushToFirestore(newList);
            return newList;
        });
    }, [currentAccountName, setLocalAccounts, user]);

    const unlinkStrategyFromAccount = useCallback((strategyId: string) => {
        if (!currentAccountName) return;
        setLocalAccounts(prev => {
            const newList = prev.map(acc => {
                if (acc.name === currentAccountName) {
                    const ids = (acc.activeStrategyIds || []).filter(id => id !== strategyId);
                    return { ...acc, activeStrategyIds: ids };
                }
                return acc;
            });
            if (user) pushToFirestore(newList);
            return newList;
        });
        triggerHaptic('medium');
    }, [currentAccountName, setLocalAccounts, user]);

    // Migration helper (can be used in App.tsx)
    const migrateLegacyStrategies = useCallback((allStrategyIds: string[]) => {
        if (!currentAccountName) return;
        setLocalAccounts(prev => {
            const newList = prev.map(acc => {
                if (acc.name === currentAccountName && acc.activeStrategyIds === undefined) {
                    // Initialize legacy accounts with ALL strategies so nothing disappears
                    return { ...acc, activeStrategyIds: allStrategyIds };
                }
                return acc;
            });
            if (user) pushToFirestore(newList);
            return newList;
        });
    }, [currentAccountName, setLocalAccounts, user]);

    return {
        accounts,
        currentAccount,
        currentAccountName,
        setCurrentAccountName,
        isLoading,
        saveAccount,
        deleteAccount,
        saveGoals,
        updateAccountTrades,
        linkStrategyToAccount,
        unlinkStrategyFromAccount,
        migrateLegacyStrategies
    };
};
