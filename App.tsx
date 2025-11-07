
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import useDBStorage from './hooks/useLocalStorage';
import { Account, AppView, ProcessedData, Trade, Goals, NotificationSettings, CalendarSettings } from './types';
import { processAccountData } from './utils/calculations';
import { parseCSV } from './utils/csvParser';
import { getDayIdentifier } from './utils/calendar';
import useMediaQuery from './hooks/useMediaQuery';
import usePullToRefresh from './hooks/usePullToRefresh';
import { useLanguage } from './contexts/LanguageContext';
import { triggerHaptic } from './utils/haptics';


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

// Memoize components to prevent unnecessary re-renders
const MemoizedDashboard = React.memo(Dashboard);
const MemoizedTradesList = React.memo(TradesList);
const MemoizedCalendarView = React.memo(CalendarView);
const MemoizedAnalysisView = React.memo(AnalysisView);
const MemoizedGoalsView = React.memo(GoalsView);
const MemoizedProfileView = React.memo(ProfileView);

const SyncIcon: React.FC<{ isSyncing?: boolean }> = ({ isSyncing }) => (
<svg
  xmlns="http://www.w3.org/2000/svg"
  className={`h-6 w-6 text-gray-300 ${isSyncing ? 'animate-spin' : ''}`}
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
  strokeWidth={2}
>
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M3 11.9998C3 7.02919 7.02944 2.99976 12 2.99976C14.8273 2.99976 17.35 4.30342 19 6.34242"
  />
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M19.5 2.99976L19.5 6.99976L15.5 6.99976"
  />
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M21 11.9998C21 16.9703 16.9706 20.9998 12 20.9998C9.17273 20.9998 6.64996 19.6961 5 17.6571"
  />
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M4.5 20.9998L4.5 16.9998L8.5 16.9998"
  />
</svg>
);


const App: React.FC = () => {
    const { data: accounts, setData: setAccounts, isLoading: isLoadingAccounts } = useDBStorage<Account[]>('trading_accounts_v1', []);
    const { data: currentAccountName, setData: setCurrentAccountName, isLoading: isLoadingCurrentAccount } = useDBStorage<string | null>('current_account_v1', null);
    const { data: notificationSettings, setData: setNotificationSettings } = useDBStorage<NotificationSettings>('notification_settings', { tradeClosed: true, weeklySummary: true });
    const { data: calendarSettings, setData: setCalendarSettings } = useDBStorage<CalendarSettings>('calendar_settings_v1', { hideWeekends: false });
    
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
    const [transitioningDay, setTransitioningDay] = useState<string | null>(null);

    const [launchedFileContent, setLaunchedFileContent] = useState<{trades: Trade[], fileName: string} | null>(null);

    const isDesktop = useMediaQuery('(min-width: 768px)');
    const { t } = useLanguage();
    
    const isLoading = isLoadingAccounts || isLoadingCurrentAccount;

    const currentAccount = useMemo(() => {
        if (isLoading) return null;
        return accounts.find(acc => acc.name === currentAccountName) || null;
    }, [accounts, currentAccountName, isLoading]);

    const refreshData = useCallback(async (accountToSync: Account) => {
        if (!accountToSync.dataUrl || isSyncingRef.current) return;
        setIsSyncing(true);
        setError(null);
        try {
            const response = await fetch(accountToSync.dataUrl, { cache: 'reload' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const csvText = await response.text();
            const newTrades = parseCSV(csvText);
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
            if (!navigator.onLine) setError(t('errors.offline'));
            else setError(t('errors.fetch_failed'));
        } finally {
            setIsSyncing(false);
        }
    }, [t, setAccounts]);

    const handleRefresh = useCallback(() => {
        if (currentAccount && currentAccount.dataUrl) refreshData(currentAccount);
    }, [currentAccount, refreshData]);

    const { pullToRefreshRef, isRefreshing, pullDistance } = usePullToRefresh(handleRefresh);
    const PULL_THRESHOLD = 80;


    // --- PWA & NOTIFICATIONS SETUP ---
    useEffect(() => {
        // 1. Register periodic background sync
        const registerPeriodicSync = async () => {
            const registration = await navigator.serviceWorker.ready;
            try {
                // @ts-ignore
                await registration.periodicSync.register('account-sync', {
                    minInterval: 6 * 60 * 1000, // 6 minutes
                });
                console.log('Periodic sync registered!');
            } catch (e) {
                console.error('Periodic background sync could not be registered.', e);
            }
        };
        if ('serviceWorker' in navigator && 'PeriodicSyncManager' in window) {
            registerPeriodicSync();
        }

        // 2. Handle PWA installation prompt events
        const beforeInstallHandler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        const appInstalledHandler = () => {
            setInstallPrompt(null);
        };
        window.addEventListener('beforeinstallprompt', beforeInstallHandler);
        window.addEventListener('appinstalled', appInstalledHandler);

        // 3. Handle navigation from app shortcuts
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view') as AppView;
        if (viewParam && ['dashboard', 'trades', 'calendar', 'goals', 'profile'].includes(viewParam)) {
            setView(viewParam);
        }

        // 4. Handle file open events
        if ('launchQueue' in window) {
            (window as any).launchQueue.setConsumer(async (launchParams: { files: any[] }) => {
                if (!launchParams.files || launchParams.files.length === 0) return;
                try {
                    const fileHandle = launchParams.files[0];
                    const file = await fileHandle.getFile();
                    const content = await file.text();
                    const trades = parseCSV(content);
                    setLaunchedFileContent({ trades, fileName: file.name });
                    setModalMode('add');
                    setAddAccountModalOpen(true);
                } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to handle launched file.');
                }
            });
        }
        
        // Cleanup listeners
        return () => {
            window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
            window.removeEventListener('appinstalled', appInstalledHandler);
        };
    }, []);
    
    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
            if (choiceResult.outcome === 'accepted') {
                setInstallPrompt(null);
            }
        });
    };
    
    useEffect(() => {
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
    
    const hasRunInitialSync = useRef(false);
    useEffect(() => {
        if (isLoading || hasRunInitialSync.current || accounts.length === 0) return;
        const syncAll = async () => {
            const accountsToSync = accounts.filter(acc => acc.dataUrl);
            if (accountsToSync.length > 0) {
                await Promise.all(accountsToSync.map(acc => refreshData(acc)));
            }
        };
        syncAll();
        hasRunInitialSync.current = true;
    }, [accounts, refreshData, isLoading]);

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
        setAddAccountModalOpen(false);
    
        if (mode === 'update' && accountData.dataUrl) {
            const updatedAccount = accounts.find(acc => acc.name === accountData.name);
            if (updatedAccount) {
                refreshData({ ...updatedAccount, ...accountData });
            }
        }
    }, [accounts, setAccounts, setCurrentAccountName, refreshData]);
    
    const deleteAccount = useCallback(() => {
        if (!currentAccountName) return;
        setAccounts(prev => prev.filter(acc => acc.name !== currentAccountName));
        setDeleteConfirmModalOpen(false);
        triggerHaptic('heavy');
    }, [currentAccountName, setAccounts]);

    const handleOpenAccountActions = () => setAccountActionModalOpen(true);
    const handleAddClick = () => { setModalMode('add'); setAddAccountModalOpen(true); setAccountActionModalOpen(false); };
    const handleUpdateClick = () => { setModalMode('update'); setAddAccountModalOpen(true); setAccountActionModalOpen(false); };
    const handleDeleteClick = () => { setDeleteConfirmModalOpen(true); setAccountActionModalOpen(false); };
    
    const saveGoals = useCallback((goals: Goals) => {
        if (!currentAccountName) return;
        setAccounts(prev => prev.map(acc => acc.name === currentAccountName ? { ...acc, goals } : acc));
        triggerHaptic('success');
    }, [currentAccountName, setAccounts]);

    // --- View Transition Handlers for Calendar Modal ---
    const handleDayClick = (date: Date) => {
        // @ts-ignore
        if (!document.startViewTransition) {
            setSelectedCalendarDate(date);
            return;
        }
        const dayId = getDayIdentifier(date);
        setTransitioningDay(dayId);
        // @ts-ignore
        document.startViewTransition(() => {
            setSelectedCalendarDate(date);
        });
    };
    
    const handleCloseDayModal = () => {
        // @ts-ignore
        if (!document.startViewTransition) {
            setSelectedCalendarDate(null);
            setTransitioningDay(null);
            return;
        }
        // @ts-ignore
        const transition = document.startViewTransition(() => {
            setSelectedCalendarDate(null);
        });

        // Using .then() for wider compatibility, as .finally() was causing errors in some environments.
        transition.finished.then(() => {
            setTransitioningDay(null);
        });
    };
    
    const dayDetailModalData = useMemo(() => {
        if (!selectedCalendarDate || !processedData) return null;
        const dateKey = getDayIdentifier(selectedCalendarDate);
        const dailyTrades = processedData.closedTrades.filter(t => getDayIdentifier(t.closeTime) === dateKey);
        if (dailyTrades.length === 0) return null;
        const tradesBefore = processedData.closedTrades.filter(t => t.closeTime.getTime() < dailyTrades[0].closeTime.getTime());
        const startOfDayBalance = (currentAccount?.initialBalance ?? 0) + tradesBefore.reduce((sum, t) => sum + (t.profit + t.commission + t.swap), 0);
        return { trades: dailyTrades, date: selectedCalendarDate, startOfDayBalance };
    }, [selectedCalendarDate, processedData, currentAccount?.initialBalance]);

    const renderView = () => {
        if (isLoading) {
            // This is shown while the DB is being read for the first time
            return <div className="app-loader" style={{ position: 'relative', height: '50vh' }}></div>;
        }

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
                         {processedData.openTrades.length > 0 && (
                            <div className="animate-fade-in-up animation-delay-400">
                                <OpenTradesTable trades={processedData.openTrades} floatingPnl={processedData.metrics.floatingPnl} currency={currentAccount.currency || 'USD'} />
                            </div>
                        )}
                        <div className="animate-fade-in-up animation-delay-500">
                            <RecentTradesTable trades={processedData.recentTrades} currency={currentAccount.currency || 'USD'} />
                        </div>
                        <div className="animate-fade-in-up animation-delay-600">
                           <DashboardMetricsBottom metrics={processedData.metrics} currency={currentAccount.currency || 'USD'}/>
                        </div>
                    </div>
                );
            case 'trades': return <MemoizedTradesList trades={processedData.closedTrades} currency={currentAccount.currency || 'USD'} />;
            case 'calendar': return <MemoizedCalendarView trades={processedData.closedTrades} onDayClick={handleDayClick} currency={currentAccount.currency || 'USD'} transitioningDay={transitioningDay} calendarSettings={calendarSettings} />;
            case 'analysis': return <MemoizedAnalysisView trades={processedData.closedTrades} initialBalance={currentAccount.initialBalance} onBackToDashboard={() => setView('dashboard')} currency={currentAccount.currency || 'USD'} />;
            case 'goals': return <MemoizedGoalsView metrics={processedData.metrics} accountGoals={currentAccount.goals || {}} onSaveGoals={saveGoals} currency={currentAccount.currency || 'USD'} />;
            case 'profile': return <MemoizedProfileView canInstall={!!installPrompt} onInstallClick={handleInstallClick} notificationSettings={notificationSettings} onNotificationSettingsChange={setNotificationSettings} />;
            default: return null;
        }
    };
    
    return (
        <>
            <div className="flex h-screen overflow-hidden">
                {isDesktop && <Sidebar currentView={view} onNavigate={setView} />}
                <div className="flex-1 flex flex-col w-full">
                    <header className="flex-shrink-0 z-10 bg-[#0c0b1e] shadow-lg shadow-black/30 app-region-drag">
                        <div className="max-w-4xl mx-auto px-4 md:px-6" style={{ paddingTop: 'env(titlebar-area-height, 0)'}}>
                            <div className={`flex ${!isDesktop ? 'justify-between' : 'justify-end'} items-center h-20`}>
                                {!isDesktop && (
                                    <div className="flex items-center gap-2 app-region-no-drag">
                                        <img src="https://i.imgur.com/TN8saNO.png" alt="Atlas Logo" className="h-10 w-auto object-contain" />
                                        <span className="text-xl font-bold tracking-widest text-[#8B9BBD]">ATLAS</span>
                                    </div>
                                )}
                                <div className="app-region-no-drag">
                                    {!isLoading && accounts.length > 0 && <AccountSelector accountNames={accounts.map(a => a.name)} currentAccount={currentAccountName} onSelectAccount={setCurrentAccountName} onAddAccount={handleOpenAccountActions} />}
                                </div>
                            </div>
                        </div>
                    </header>
                    
                    <div className="flex-1 relative overflow-y-hidden">
                        {/* Custom Pull-to-Refresh Indicator */}
                        {!isDesktop && (
                            <div
                                className="absolute top-0 left-0 right-0 flex justify-center items-center z-0 pointer-events-none"
                                style={{
                                    height: '50px',
                                    transform: `translateY(${isRefreshing ? 0 : pullDistance - 50}px)`,
                                    transition: pullDistance === 0 && !isRefreshing ? 'transform 0.3s' : 'none',
                                    opacity: isRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1),
                                }}
                            >
                                <div 
                                    className="p-3 bg-gray-800 rounded-full shadow-lg"
                                    style={{ 
                                        transform: `rotate(${pullDistance * 2}deg) scale(${isRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1)})`,
                                        transition: 'transform 0.3s'
                                    }}
                                >
                                    <SyncIcon isSyncing={isRefreshing} />
                                </div>
                            </div>
                        )}

                        <main
                            ref={pullToRefreshRef}
                            className="flex-1 overflow-y-auto h-full"
                            style={{
                                transform: `translateY(${isRefreshing ? 50 : pullDistance}px)`,
                                transition: pullDistance === 0 && !isRefreshing ? 'transform 0.3s' : 'none',
                            }}
                        >
                             <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 pb-24 md:pb-6">
                                {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">{error}</div>}
                                {renderView()}
                            </div>
                        </main>
                        
                    </div>
                    {!isDesktop && <BottomNav hasAccount={!!currentAccount} currentView={view} onNavigate={setView} calendarSettings={calendarSettings} onCalendarSettingsChange={setCalendarSettings} />}
                </div>
            </div>
            
            {/* Modals */}
            <AddAccountModal 
                isOpen={isAddAccountModalOpen} 
                onClose={() => setAddAccountModalOpen(false)} 
                onSaveAccount={saveAccount}
                mode={modalMode}
                accountToUpdate={currentAccount}
                launchedFileContent={launchedFileContent}
                onLaunchedFileConsumed={() => setLaunchedFileContent(null)}
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
            {dayDetailModalData && (
                 <DayDetailModal 
                    isOpen={!!selectedCalendarDate} 
                    onClose={handleCloseDayModal} 
                    {...dayDetailModalData}
                    currency={currentAccount.currency || 'USD'}
                    transitioningDay={transitioningDay}
                />
            )}
            <DeleteConfirmationModal 
                isOpen={isDeleteConfirmModalOpen}
                onClose={() => setDeleteConfirmModalOpen(false)}
                onConfirm={deleteAccount}
                accountName={currentAccount?.name || ''}
            />

            {error && <div className="fixed bottom-4 right-4 bg-red-800 text-white p-4 rounded-lg shadow-lg animate-fade-in-up">{error}</div>}
        </>
    );
};

// FIX: Add default export for the App component.
export default App;
