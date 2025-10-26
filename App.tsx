import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { Account, AppView, ProcessedData, Trade, Goals } from './types';
import { processAccountData, calculateBenchmarkPerformance } from './utils/calculations';
import { parseCSV } from './utils/csvParser';
import usePullToRefresh from './hooks/usePullToRefresh';
import { getDayIdentifier } from './utils/calendar';
import useMediaQuery from './hooks/useMediaQuery';
import { useLanguage } from './contexts/LanguageContext';

// Components
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import BalanceChart from './components/BalanceChart';
import RecentTradesTable from './components/RecentTradesTable';
import OpenTradesTable from './components/OpenTradesTable';
import AddAccountModal from './components/AddAccount';
import AccountSelector from './components/AccountSelector';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import TradesList from './components/TradesList';
import CalendarView from './components/CalendarView';
import ProfileView from './components/ProfileView';
import AnalysisView from './components/AnalysisView';
import AccountActionModal from './components/AccountActionModal';
import DashboardMetricsBottom from './components/DashboardMetricsBottom';
import GoalsView from './components/GoalsView';
import DayDetailModal from './components/DayDetailModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import BenchmarkComparison from './components/BenchmarkComparison';

// Memoize components to prevent unnecessary re-renders
const MemoizedDashboard = React.memo(Dashboard);
const MemoizedTradesList = React.memo(TradesList);
const MemoizedCalendarView = React.memo(CalendarView);
const MemoizedAnalysisView = React.memo(AnalysisView);
const MemoizedGoalsView = React.memo(GoalsView);
const MemoizedProfileView = React.memo(ProfileView);


const App: React.FC = () => {
    const [accounts, setAccounts] = useLocalStorage<Account[]>('trading_accounts_v1', []);
    const [currentAccountName, setCurrentAccountName] = useLocalStorage<string | null>('current_account_v1', null);
    
    const [isAddAccountModalOpen, setAddAccountModalOpen] = useState(false);
    const [isAccountActionModalOpen, setAccountActionModalOpen] = useState(false);
    const [isDeleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'update'>('add');
    
    const [view, setView] = useState<AppView>('dashboard');
    const [error, setError] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const isSyncingRef = useRef(isSyncing);
    isSyncingRef.current = isSyncing;

    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

    const [logoUrl, setLogoUrl] = useLocalStorage<string | null>('logo_url_v1', null);
    const [logoError, setLogoError] = useState(false);

    const isDesktop = useMediaQuery('(min-width: 768px)');
    const { t } = useLanguage();

    useEffect(() => {
        setLogoError(false);
    }, [logoUrl]);
    
    // PWA Install prompt handler
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            setInstallPrompt(null);
        });
    };
    
    // This effect handles the logic of selecting the current account safely after render.
    useEffect(() => {
        const accountExists = accounts.some(acc => acc.name === currentAccountName);
        
        if (!currentAccountName && accounts.length > 0) {
            setCurrentAccountName(accounts[0].name);
        } else if (currentAccountName && !accountExists && accounts.length > 0) {
            setCurrentAccountName(accounts[0].name);
        } else if (accounts.length === 0) {
            setCurrentAccountName(null);
        }
    }, [accounts, currentAccountName, setCurrentAccountName]);

    const currentAccount = useMemo(() => {
        return accounts.find(acc => acc.name === currentAccountName) || null;
    }, [accounts, currentAccountName]);

    const processedData: ProcessedData | null = useMemo(() => {
        if (!currentAccount) return null;
        try {
            return processAccountData(currentAccount);
        } catch (e) {
            console.error(e);
            setError("Error processing account data.");
            return null;
        }
    }, [currentAccount]);

    const benchmarkReturn = useMemo(() => {
        if (!processedData || processedData.closedTrades.length < 2) return null;
        const firstTradeDate = processedData.closedTrades[0].openTime;
        const lastTradeDate = processedData.closedTrades[processedData.closedTrades.length - 1].closeTime;
        return calculateBenchmarkPerformance(firstTradeDate, lastTradeDate);
    }, [processedData]);
    
    const refreshData = useCallback(async (accountToSync: Account) => {
        if (!accountToSync.dataUrl) return;
        if (isSyncingRef.current) return;

        setIsSyncing(true);
        setError(null);
        try {
            const response = await fetch(accountToSync.dataUrl, { cache: 'reload' });
            
            if (!response.ok) {
                if (response.status === 404) {
                     setError(`Error: The URL was not found (404). Please check the link.`);
                } else {
                     setError(t('errors.fetch_failed'));
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            const newTrades = parseCSV(csvText);
            
            // Replace trades instead of merging for live URL sources
            setAccounts(prevAccounts => 
                prevAccounts.map(acc => {
                    if (acc.name === accountToSync.name) {
                        const sortedTrades = newTrades.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
                        return { ...acc, trades: sortedTrades, lastUpdated: new Date().toISOString() };
                    }
                    return acc;
                })
            );

        } catch (err) {
            console.error("Failed to fetch or process data:", err);
            // Check for offline status
            if (!navigator.onLine) {
                setError(t('errors.offline'));
            } else {
                setError(prev => prev || t('errors.fetch_failed'));
            }
        } finally {
            setIsSyncing(false);
        }
    }, [t, setAccounts]);


    const hasRunInitialSync = useRef(false);
    useEffect(() => {
        if (hasRunInitialSync.current || accounts.length === 0) {
            return;
        }

        const syncAll = async () => {
            const accountsToSync = accounts.filter(acc => acc.dataUrl);
            if (accountsToSync.length > 0) {
                console.log("Performing initial account sync...");
                await Promise.all(accountsToSync.map(acc => refreshData(acc)));
                console.log("Initial sync complete.");
            }
        };

        syncAll();
        hasRunInitialSync.current = true;
        
    }, [accounts, refreshData]);

    const saveAccount = useCallback((
        accountData: { name: string; trades: Trade[]; initialBalance: number; currency: 'USD' | 'EUR', dataUrl?: string }, 
        mode: 'add' | 'update'
    ) => {
        setError(null);
        setAccounts(prevAccounts => {
            if (mode === 'add') {
                if (prevAccounts.some(acc => acc.name === accountData.name)) {
                    setError(`An account with the name "${accountData.name}" already exists.`);
                    return prevAccounts;
                }
                const newAccount: Account = {
                    ...accountData,
                    goals: {},
                    lastUpdated: new Date().toISOString(),
                };
                const newAccounts = [...prevAccounts, newAccount];
                setCurrentAccountName(newAccount.name); // Switch to the new account
                return newAccounts;
            } else { // mode === 'update'
                return prevAccounts.map(acc => {
                    if (acc.name === accountData.name) {
                        const existingTrades = acc.trades;
                        const newTrades = accountData.trades;
                        const tradesMap = new Map(existingTrades.map(t => [t.ticket, t]));
                        newTrades.forEach(t => tradesMap.set(t.ticket, t));
                        // FIX: Explicitly type sort parameters to resolve TypeScript error.
                        const allTrades = Array.from(tradesMap.values()).sort((a: Trade, b: Trade) => a.openTime.getTime() - b.openTime.getTime());

                        return {
                            ...acc,
                            initialBalance: accountData.initialBalance,
                            currency: accountData.currency,
                            dataUrl: accountData.dataUrl,
                            trades: accountData.dataUrl ? acc.trades : allTrades, // If URL, don't update trades from file.
                            lastUpdated: new Date().toISOString(),
                        };
                    }
                    return acc;
                });
            }
        });
        setAddAccountModalOpen(false);

        if (accountData.dataUrl) {
            const accountToSync = accounts.find(acc => acc.name === accountData.name) || { ...accountData, trades: [], goals: {} };
            refreshData(accountToSync);
        }
    }, [setAccounts, setCurrentAccountName, refreshData, accounts]);
    
    const deleteAccount = useCallback(() => {
        if (!currentAccountName) return;
        setAccounts(prev => prev.filter(acc => acc.name !== currentAccountName));
        setDeleteConfirmModalOpen(false);
    }, [currentAccountName, setAccounts]);

    const handleRefresh = useCallback(() => {
        if (currentAccount && currentAccount.dataUrl) {
            refreshData(currentAccount);
        }
    }, [currentAccount, refreshData]);

    const { pullToRefreshRef } = usePullToRefresh(handleRefresh);

    const handleOpenAccountActions = () => setAccountActionModalOpen(true);
    const handleAddClick = () => { setModalMode('add'); setAddAccountModalOpen(true); setAccountActionModalOpen(false); };
    const handleUpdateClick = () => { setModalMode('update'); setAddAccountModalOpen(true); setAccountActionModalOpen(false); };
    const handleDeleteClick = () => { setDeleteConfirmModalOpen(true); setAccountActionModalOpen(false); };
    
    const saveGoals = useCallback((goals: Goals) => {
        if (!currentAccountName) return;
        setAccounts(prev => prev.map(acc => acc.name === currentAccountName ? { ...acc, goals } : acc));
    }, [currentAccountName, setAccounts]);
    
    const dayDetailModalData = useMemo(() => {
        if (!selectedCalendarDate || !processedData) return null;
        
        const dateKey = getDayIdentifier(selectedCalendarDate);
        const dailyTrades = processedData.closedTrades.filter(t => getDayIdentifier(t.closeTime) === dateKey);

        if (dailyTrades.length === 0) return null;
        
        const firstTradeOfDay = dailyTrades[0];
        const tradesBefore = processedData.closedTrades.filter(t => t.closeTime.getTime() < firstTradeOfDay.closeTime.getTime());
        const startOfDayBalance = (currentAccount?.initialBalance ?? 0) + tradesBefore.reduce((sum, t) => sum + (t.profit + t.commission + t.swap), 0);

        return { trades: dailyTrades, date: selectedCalendarDate, startOfDayBalance };
    }, [selectedCalendarDate, processedData, currentAccount?.initialBalance]);

    const renderView = () => {
        if (!currentAccount || !processedData) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <h1 className="text-3xl font-bold text-white mb-4">{t('app.welcome')}</h1>
                    <p className="text-gray-400 mb-8">{t('app.add_account_prompt')}</p>
                    <button onClick={handleAddClick} className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105">
                        {t('app.add_first_account_button')}
                    </button>
                </div>
            );
        }

        switch(view) {
            case 'dashboard':
                return (
                     <div className="space-y-6">
                        <div className="animate-fade-in-up">
                            <Header metrics={processedData.metrics} accountName={currentAccount.name} lastUpdated={currentAccount.lastUpdated} onRefresh={handleRefresh} isSyncing={isSyncing} currency={currentAccount.currency || 'USD'} />
                        </div>
                        <div className="animate-fade-in-up animation-delay-200">
                            <MemoizedDashboard metrics={processedData.metrics} currency={currentAccount.currency || 'USD'} />
                        </div>
                        <div className="animate-fade-in-up animation-delay-300">
                           <BalanceChart data={processedData.chartData} onAdvancedAnalysisClick={() => setView('analysis')} initialBalance={currentAccount.initialBalance} currency={currentAccount.currency || 'USD'} goals={currentAccount.goals || {}} />
                        </div>
                        {benchmarkReturn !== null && (
                            <div className="animate-fade-in-up animation-delay-400">
                                <BenchmarkComparison
                                    userReturn={processedData.metrics.totalReturnPercent}
                                    benchmarkReturn={benchmarkReturn}
                                />
                            </div>
                        )}
                         {processedData.openTrades.length > 0 && (
                            <div className="animate-fade-in-up animation-delay-500">
                                <OpenTradesTable trades={processedData.openTrades} floatingPnl={processedData.metrics.floatingPnl} currency={currentAccount.currency || 'USD'} />
                            </div>
                        )}
                        <div className="animate-fade-in-up animation-delay-600">
                            <RecentTradesTable trades={processedData.recentTrades} currency={currentAccount.currency || 'USD'}/>
                        </div>
                        <div className="animate-fade-in-up animation-delay-700">
                           <DashboardMetricsBottom metrics={processedData.metrics} currency={currentAccount.currency || 'USD'}/>
                        </div>
                    </div>
                );
            case 'trades': return <MemoizedTradesList trades={processedData.closedTrades} currency={currentAccount.currency || 'USD'} />;
            case 'calendar': return <MemoizedCalendarView trades={processedData.closedTrades} onDayClick={setSelectedCalendarDate} currency={currentAccount.currency || 'USD'} />;
            case 'analysis': return <MemoizedAnalysisView trades={processedData.closedTrades} initialBalance={currentAccount.initialBalance} onBackToDashboard={() => setView('dashboard')} currency={currentAccount.currency || 'USD'} />;
            case 'goals': return <MemoizedGoalsView metrics={processedData.metrics} accountGoals={currentAccount.goals || {}} onSaveGoals={saveGoals} currency={currentAccount.currency || 'USD'} />;
            case 'profile': return <MemoizedProfileView canInstall={!!installPrompt} onInstallClick={handleInstallClick} logoUrl={logoUrl} setLogoUrl={setLogoUrl} />;
            default: return null;
        }
    };
    
    return (
        <>
            <div className="flex h-screen overflow-hidden">
                {isDesktop && <Sidebar currentView={view} onNavigate={setView} logoUrl={logoUrl} />}
                <div className="flex-1 flex flex-col w-full">
                    <header className="flex-shrink-0 z-10 bg-[#0c0b1e] shadow-lg shadow-black/30">
                        <div className="max-w-4xl mx-auto px-4 md:px-6">
                            <div className={`flex ${!isDesktop ? 'justify-between' : 'justify-end'} items-center h-20`}>
                                {!isDesktop && (
                                    <div className="flex items-center gap-2">
                                        {(logoUrl && !logoError) ? (
                                            <img src={logoUrl} alt="Atlas Logo" className="h-10 w-auto object-contain" onError={() => setLogoError(true)} />
                                        ) : (
                                            <img src="https://i.imgur.com/CGGyy54.png" alt="Atlas Logo" className="h-10 w-auto object-contain" />
                                        )}
                                        <span className="text-xl font-bold tracking-widest text-[#8B9BBD]">ATLAS</span>
                                    </div>
                                )}
                                {accounts.length > 0 && <AccountSelector accountNames={accounts.map(a => a.name)} currentAccount={currentAccountName} onSelectAccount={setCurrentAccountName} onAddAccount={handleOpenAccountActions} />}
                            </div>
                        </div>
                    </header>

                    <main ref={pullToRefreshRef as React.RefObject<HTMLDivElement>} className="flex-1 overflow-y-auto">
                         <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 pb-24 md:pb-6">
                             {error && (
                                <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded-lg text-sm mb-4 flex justify-between items-center animate-fade-in">
                                    <span>{error}</span>
                                    <button onClick={() => setError(null)} className="font-bold text-xl">&times;</button>
                                </div>
                            )}
                            {renderView()}
                         </div>
                    </main>
                </div>
            </div>
            {!isDesktop && <BottomNav currentView={view} onNavigate={setView} />}

            <AddAccountModal 
                isOpen={isAddAccountModalOpen} 
                onClose={() => setAddAccountModalOpen(false)}
                onSaveAccount={saveAccount}
                mode={modalMode}
                accountToUpdate={currentAccount}
            />
            <AccountActionModal
                isOpen={isAccountActionModalOpen}
                onClose={() => setAccountActionModalOpen(false)}
                onAddAccount={handleAddClick}
                onUpdateAccount={handleUpdateClick}
                onDeleteAccount={handleDeleteClick}
                canUpdate={!!currentAccount}
                canDelete={!!currentAccount}
            />
            <DeleteConfirmationModal
                isOpen={isDeleteConfirmModalOpen}
                onClose={() => setDeleteConfirmModalOpen(false)}
                onConfirm={deleteAccount}
                accountName={currentAccount?.name || ''}
            />
            {dayDetailModalData && (
                <DayDetailModal
                    isOpen={!!selectedCalendarDate}
                    onClose={() => setSelectedCalendarDate(null)}
                    trades={dayDetailModalData.trades}
                    date={dayDetailModalData.date}
                    startOfDayBalance={dayDetailModalData.startOfDayBalance}
                    currency={currentAccount?.currency || 'USD'}
                />
            )}
        </>
    );
};

export default App;