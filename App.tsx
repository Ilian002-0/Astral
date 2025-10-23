
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { Account, AppView, ProcessedData, Trade, Goals } from './types';
import { processAccountData } from './utils/calculations';
import { parseCSV } from './utils/csvParser';
import usePullToRefresh from './hooks/usePullToRefresh';
import { getDayIdentifier } from './utils/calendar';
import useMediaQuery from './hooks/useMediaQuery';

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

    const isDesktop = useMediaQuery('(min-width: 768px)');
    const syncedAccountsRef = useRef<Set<string>>(new Set());
    
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
            // If no account is selected, default to the first one.
            setCurrentAccountName(accounts[0].name);
        } else if (currentAccountName && !accountExists && accounts.length > 0) {
            // If the selected account was deleted, switch to the first one.
            setCurrentAccountName(accounts[0].name);
        } else if (accounts.length === 0) {
            // If there are no accounts, clear the selection.
            setCurrentAccountName(null);
        }
    }, [accounts, currentAccountName, setCurrentAccountName]);

    const currentAccount = useMemo(() => {
        // This memo now only performs the calculation without side effects.
        return accounts.find(acc => acc.name === currentAccountName) || null;
    }, [accounts, currentAccountName]);

    const processedData: ProcessedData | null = useMemo(() => processAccountData(currentAccount), [currentAccount]);

    // Data for DayDetailModal
    const tradesForSelectedDay = useMemo(() => {
        if (!selectedCalendarDate || !processedData) return [];
        const selectedId = getDayIdentifier(selectedCalendarDate);
        return processedData.closedTrades.filter(trade => getDayIdentifier(trade.closeTime) === selectedId);
    }, [selectedCalendarDate, processedData]);

    const startOfDayBalance = useMemo(() => {
        if (!selectedCalendarDate || !processedData || !currentAccount) return 0;
    
        const startOfSelectedDay = new Date(selectedCalendarDate);
        startOfSelectedDay.setHours(0, 0, 0, 0);
    
        const tradesBeforeSelectedDay = processedData.closedTrades.filter(
            trade => trade.closeTime.getTime() < startOfSelectedDay.getTime()
        );
        
        const profitBeforeSelectedDay = tradesBeforeSelectedDay.reduce(
            (sum, trade) => sum + (trade.profit + trade.commission + trade.swap), 0
        );
    
        return currentAccount.initialBalance + profitBeforeSelectedDay;
    }, [selectedCalendarDate, processedData, currentAccount]);


    const refreshData = useCallback(async () => {
        if (!currentAccount || !currentAccount.dataUrl || isSyncingRef.current) return;

        setIsSyncing(true);
        setError(null);
        try {
            // Create a new URL object to safely add a cache-busting parameter.
            // This prevents issues if the original URL already has query params.
            const url = new URL(currentAccount.dataUrl);
            url.searchParams.set('_cache_bust', new Date().getTime().toString());

            const response = await fetch(url.toString(), {
                method: 'GET',
                // Use the most aggressive cache-bypassing settings
                cache: 'no-store', 
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                redirect: 'follow' // Explicitly follow redirects
            });
            
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            const csvText = await response.text();
            
            if (!csvText || csvText.trim() === '') {
                throw new Error("Received empty data file from the URL.");
            }

            const newTrades = parseCSV(csvText);

            setAccounts(prevAccounts => {
                return prevAccounts.map(acc => {
                    if (acc.name === currentAccount.name) {
                        const existingTrades = acc.trades;
    
                        // Create a map of all trades, prioritizing the new file's data for updates.
                        const allTradesMap = new Map<number, Trade>();
        
                        // First, add all existing trades to the map. This preserves trades
                        // that might not be in a partial (e.g., last month's) CSV export.
                        for (const trade of existingTrades) {
                            allTradesMap.set(trade.ticket, trade);
                        }
        
                        // Then, add/overwrite with trades from the new file. This updates
                        // existing trades (like closing an open one) and adds new ones.
                        for (const trade of newTrades) {
                            allTradesMap.set(trade.ticket, trade);
                        }
                        
                        const mergedTrades = Array.from(allTradesMap.values());
                        
                        return {
                            ...acc,
                            trades: mergedTrades,
                            lastUpdated: new Date().toISOString(),
                        };
                    }
                    return acc;
                });
            });
        } catch (err) {
            let errorMessage = 'An unknown error occurred during sync.';
            if (err instanceof Error) {
                // Check for a common fetch/CORS failure which often manifests as a TypeError
                if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                    errorMessage = "Could not fetch the data. This might be a network issue or a CORS problem. Please ensure the URL is a direct, public link to a CSV file (e.g., from Google Sheets 'Publish to the web').";
                } else {
                    errorMessage = err.message;
                }
            }
            setError(errorMessage);
        } finally {
            setIsSyncing(false);
        }
    }, [currentAccount, setAccounts]);
    
    const { pullToRefreshRef, isRefreshing } = usePullToRefresh(refreshData);

    useEffect(() => {
        // Automatically refresh data on mobile, but only once per account per session.
        if (!isDesktop && currentAccount?.dataUrl && !syncedAccountsRef.current.has(currentAccount.name)) {
            refreshData();
            syncedAccountsRef.current.add(currentAccount.name);
        }
    }, [currentAccount, isDesktop, refreshData]);

    const handleOpenAccountActions = () => {
        setAccountActionModalOpen(true);
    };

    const handleInitiateAdd = () => {
        setModalMode('add');
        setAccountActionModalOpen(false);
        setAddAccountModalOpen(true);
    };
    
    const handleInitiateUpdate = () => {
        if (currentAccount) {
            setModalMode('update');
            setAccountActionModalOpen(false);
            setAddAccountModalOpen(true);
        }
    };

    const handleInitiateDelete = () => {
        if (currentAccount) {
            setAccountActionModalOpen(false);
            setDeleteConfirmModalOpen(true);
        }
    };

    const handleDeleteAccount = () => {
        if (!currentAccount) return;
        setAccounts(accounts.filter(acc => acc.name !== currentAccount.name));
        setDeleteConfirmModalOpen(false);
    };

    const handleSaveAccount = (accountData: { name: string, trades: Trade[], initialBalance: number, currency: 'USD' | 'EUR', dataUrl?: string }, mode: 'add' | 'update') => {
        if (mode === 'add') {
            if (accounts.some(acc => acc.name.toLowerCase() === accountData.name.toLowerCase())) {
                setError(`An account with the name "${accountData.name}" already exists.`);
                setAddAccountModalOpen(true); // Keep modal open to show error
                return;
            }
            const newAccount: Account = {
                name: accountData.name,
                trades: accountData.trades,
                initialBalance: accountData.initialBalance,
                currency: accountData.currency,
                goals: {},
                dataUrl: accountData.dataUrl,
                lastUpdated: new Date().toISOString(),
            };
            const newAccounts = [...accounts, newAccount];
            setAccounts(newAccounts);
            if (!currentAccountName || accounts.length === 0) {
                setCurrentAccountName(newAccount.name);
            }
        } else { // update mode
            if (!currentAccount) return;
    
            setAccounts(accounts.map(acc => {
                if (acc.name === currentAccount.name) {
                    const newTradesFromFile = accountData.trades;
                    const existingTrades = acc.trades;
    
                    // Create a map of all trades, prioritizing the new file's data for updates.
                    const allTradesMap = new Map<number, Trade>();
    
                    // First, add all existing trades to the map. This preserves trades
                    // that might not be in a partial (e.g., last month's) CSV export.
                    for (const trade of existingTrades) {
                        allTradesMap.set(trade.ticket, trade);
                    }
    
                    // Then, add/overwrite with trades from the new file. This updates
                    // existing trades (like closing an open one) and adds new ones.
                    for (const trade of newTradesFromFile) {
                        allTradesMap.set(trade.ticket, trade);
                    }
                    
                    const mergedTrades = Array.from(allTradesMap.values());
                    
                    return {
                        ...acc,
                        initialBalance: accountData.initialBalance,
                        currency: accountData.currency,
                        trades: mergedTrades,
                        dataUrl: accountData.dataUrl,
                        lastUpdated: new Date().toISOString(),
                    };
                }
                return acc;
            }));
        }
        setAddAccountModalOpen(false);
        setError(null);
    };

    const handleSelectAccount = (accountName: string) => {
        setCurrentAccountName(accountName);
        setView('dashboard'); // Switch to dashboard on account change
    };
    
    const handleSaveGoals = (newGoals: Goals) => {
        if (!currentAccount) return;
    
        setAccounts(accounts.map(acc => {
            if (acc.name === currentAccount.name) {
                return { ...acc, goals: newGoals };
            }
            return acc;
        }));
    };

    const renderDashboard = () => {
        if (!processedData || !currentAccount) return null;
        const currency = currentAccount.currency || 'USD';
        return (
            <div className="space-y-6">
                <div className="animate-fade-in-up">
                    <Header 
                      metrics={processedData.metrics} 
                      accountName={currentAccount?.name}
                      lastUpdated={currentAccount.lastUpdated}
                      onRefresh={currentAccount.dataUrl ? refreshData : undefined}
                      isSyncing={isSyncing || isRefreshing}
                      currency={currency}
                    />
                </div>
                <div className="animate-fade-in-up animation-delay-100">
                    <MemoizedDashboard metrics={processedData.metrics} currency={currency} />
                </div>
                <div className="animate-fade-in-up animation-delay-200">
                    <BalanceChart 
                        data={processedData.chartData} 
                        onAdvancedAnalysisClick={() => setView('analysis')} 
                        initialBalance={currentAccount.initialBalance}
                        currency={currency}
                        goals={currentAccount.goals || {}}
                    />
                </div>
                <div className="animate-fade-in-up animation-delay-300">
                    <DashboardMetricsBottom metrics={processedData.metrics} currency={currency} />
                </div>
                 {processedData.openTrades.length > 0 && (
                    <div className="animate-fade-in-up animation-delay-400">
                        <OpenTradesTable trades={processedData.openTrades} floatingPnl={processedData.metrics.floatingPnl} currency={currency} />
                    </div>
                )}
                <div className="animate-fade-in-up animation-delay-500">
                    <RecentTradesTable trades={processedData.recentTrades} currency={currency} />
                </div>
            </div>
        );
    }
    
    const renderCurrentView = () => {
        if (!processedData || !currentAccount) {
             return (
                <div className="flex flex-col items-center justify-center text-center h-full pt-16">
                    <h1 className="text-3xl font-bold text-white mb-4">Welcome to Atlas</h1>
                    <p className="text-gray-400 mb-8 max-w-md">
                        Get started by adding your first trading account. Upload your MT4/MT5 CSV report to analyze your performance.
                    </p>
                    <button
                        onClick={handleInitiateAdd}
                        className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105"
                    >
                        Add Your First Account
                    </button>
                </div>
            );
        }
    
        const currency = currentAccount?.currency || 'USD';

        switch (view) {
            case 'dashboard':
                return renderDashboard();
            case 'trades':
                return <MemoizedTradesList trades={processedData.closedTrades} currency={currency} />;
            case 'calendar':
                return <MemoizedCalendarView trades={processedData.closedTrades} onDayClick={setSelectedCalendarDate} currency={currency} />;
            case 'analysis':
                return <MemoizedAnalysisView trades={processedData.closedTrades} initialBalance={currentAccount.initialBalance} currency={currency} onBackToDashboard={() => setView('dashboard')} />;
            case 'goals':
                return <MemoizedGoalsView metrics={processedData.metrics} accountGoals={currentAccount.goals || {}} onSaveGoals={handleSaveGoals} currency={currency} />;
            case 'profile':
                return <MemoizedProfileView canInstall={!!installPrompt} onInstallClick={handleInstallClick} />;
            default:
                return renderDashboard();
        }
    }


    return (
        <div className="bg-[#0c0b1e] text-gray-300 min-h-screen font-sans">
            <div className={`flex min-h-screen ${!isDesktop ? 'flex-col' : ''}`}>
                {isDesktop && currentAccount && (
                    <Sidebar 
                        currentView={view}
                        onNavigate={setView}
                    />
                )}
                
                {/* Wrapper for Header and Main content */}
                <div className="flex-1 flex flex-col w-full min-w-0">
                    {/* Header: Sticky on mobile, static on desktop */}
                    <header className={`${!isDesktop ? 'sticky top-0 z-20 bg-[#0c0b1e] p-4' : 'px-4 md:px-6 lg:px-8 pt-8'}`}>
                         {accounts.length > 0 && (
                            <div className="flex justify-between items-center max-w-7xl mx-auto">
                                {(view === 'dashboard' && !isDesktop) ? (
                                    <div className="flex items-center gap-3">
                                        <svg viewBox="0 0 128 112" xmlns="http://www.w3.org/2000/svg" className="h-10 w-auto">
                                            <g>
                                                <circle cx="64" cy="47" r="18" fill="#404B69"/>
                                                <path d="M56 38 A 12 12 0 0 1 72 38 M54 49 A 12 12 0 0 0 74 49 M58 60 A 10 10 0 0 1 70 60" stroke="#0c0b1e" strokeWidth="2.5" fill="none"/>
                                                <path d="M36.8,80 L61.6,0 h11.2 L47.2,80 H36.8 Z" fill="#404B69"/>
                                                <path d="M91.2,80 L66.4,0 h-11.2 L80.8,80 H91.2 Z" fill="#8B9BBD"/>
                                                <path d="M24,66 C50,18 90,25 110,32 L116,24 L124,36 L110,32 Z" fill="#8B9BBD"/>
                                            </g>
                                            <text x="64" y="100" text-anchor="middle" dominantBaseline="middle" fontFamily="inherit" fontSize="22" fontWeight="bold" letter-spacing="5" fill="#8B9BBD">ATLAS</text>
                                        </svg>
                                    </div>
                                ) : (isDesktop ? null : <div />)}
                                <AccountSelector
                                    accountNames={accounts.map(a => a.name)}
                                    currentAccount={currentAccount?.name || null}
                                    onSelectAccount={handleSelectAccount}
                                    onAddAccount={handleOpenAccountActions}
                                />
                            </div>
                         )}
                    </header>

                    <main ref={pullToRefreshRef} className={`flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full ${isDesktop ? 'pt-6' : 'pt-4'}`}>
                        {error && (
                            <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded-lg text-center text-sm mb-4 flex justify-between items-center">
                                <span><strong>Error:</strong> {error}</span>
                                <button onClick={() => setError(null)} className="ml-4 font-bold text-xl leading-none">&times;</button>
                            </div>
                        )}
                        
                        <div className={!isDesktop ? "pb-24" : ""}>
                            <div key={view} className="animate-fade-in">
                                {renderCurrentView()}
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {!isDesktop && currentAccount && (
                <BottomNav 
                    currentView={view}
                    onNavigate={setView}
                />
            )}
            
            <AccountActionModal
                isOpen={isAccountActionModalOpen}
                onClose={() => setAccountActionModalOpen(false)}
                onAddAccount={handleInitiateAdd}
                onUpdateAccount={handleInitiateUpdate}
                onDeleteAccount={handleInitiateDelete}
                canUpdate={!!currentAccount}
                canDelete={!!currentAccount}
            />

            <AddAccountModal
                isOpen={isAddAccountModalOpen || (accounts.length === 0 && !currentAccountName && !isAccountActionModalOpen)}
                onClose={() => setAddAccountModalOpen(false)}
                onSaveAccount={handleSaveAccount}
                mode={modalMode}
                accountToUpdate={currentAccount}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteConfirmModalOpen}
                onClose={() => setDeleteConfirmModalOpen(false)}
                onConfirm={handleDeleteAccount}
                accountName={currentAccount?.name || ''}
            />
            
            {processedData && (
                <DayDetailModal
                    isOpen={!!selectedCalendarDate}
                    onClose={() => setSelectedCalendarDate(null)}
                    date={selectedCalendarDate || new Date()}
                    trades={tradesForSelectedDay}
                    startOfDayBalance={startOfDayBalance}
                    currency={currentAccount?.currency || 'USD'}
                />
            )}
        </div>
    );
};

export default App;
