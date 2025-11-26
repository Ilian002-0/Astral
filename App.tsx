
import React, { useState, useMemo, useCallback, Suspense, useEffect } from 'react';
import { Account, AppView, Trade, CalendarSettings, NotificationSettings } from './types';
import { getDayIdentifier } from './utils/calendar';
import useMediaQuery from './hooks/useMediaQuery';
import usePullToRefresh from './hooks/usePullToRefresh';
import useDBStorage from './hooks/useLocalStorage';
import { useLanguage } from './contexts/LanguageContext';

// Custom Hooks
import { useAccountManager } from './hooks/useAccountManager';
import { useSync } from './hooks/useSync';
import { usePWA } from './hooks/usePWA';
import { useTradeData } from './hooks/useTradeData';

// Skeletons
import { 
    DashboardSkeleton, 
    TradesListSkeleton, 
    CalendarSkeleton, 
    AnalysisSkeleton, 
    GenericSkeleton 
} from './components/Skeletons';

// Static Imports (Layout & critical UI)
import Header from './components/Header';
import AccountSelector from './components/AccountSelector';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import Logo from './components/Logo';

// Dynamic Imports (Lazy Loading)
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const BalanceChart = React.lazy(() => import('./components/BalanceChart'));
const RecentTradesTable = React.lazy(() => import('./components/RecentTradesTable'));
const OpenTradesTable = React.lazy(() => import('./components/OpenTradesTable'));
const DashboardMetricsBottom = React.lazy(() => import('./components/DashboardMetricsBottom'));

const TradesList = React.lazy(() => import('./components/TradesList'));
const CalendarView = React.lazy(() => import('./components/CalendarView'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const AnalysisView = React.lazy(() => import('./components/AnalysisView'));
const GoalsView = React.lazy(() => import('./components/GoalsView'));

const AddAccountModal = React.lazy(() => import('./components/AddAccount'));
const AccountActionModal = React.lazy(() => import('./components/AccountActionModal'));
const DayDetailModal = React.lazy(() => import('./components/DayDetailModal'));
const DeleteConfirmationModal = React.lazy(() => import('./components/DeleteConfirmationModal'));


const SyncIcon: React.FC<{ isSyncing?: boolean }> = ({ isSyncing }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-gray-300 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.9998C3 7.02919 7.02944 2.99976 12 2.99976C14.8273 2.99976 17.35 4.30342 19 6.34242" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 2.99976L19.5 6.99976L15.5 6.99976" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.9998C21 16.9703 16.9706 20.9998 12 20.9998C9.17273 20.9998 6.64996 19.6961 5 17.6571" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.9998L4.5 16.9998L8.5 16.9998" />
    </svg>
);

const App: React.FC = () => {
    // 1. Core Data Management
    const { 
        accounts, 
        currentAccount, 
        currentAccountName, 
        setCurrentAccountName, 
        isLoading, 
        saveAccount, 
        deleteAccount, 
        saveGoals,
        updateAccountTrades
    } = useAccountManager();

    // 2. Settings & UI State
    const { data: notificationSettings, setData: setNotificationSettings } = useDBStorage<NotificationSettings>('notification_settings', { tradeClosed: true, weeklySummary: true });
    const { data: calendarSettings, setData: setCalendarSettings } = useDBStorage<CalendarSettings>('calendar_settings_v1', { hideWeekends: false });
    
    const [view, setView] = useState<AppView>('dashboard');
    const [isAddAccountModalOpen, setAddAccountModalOpen] = useState(false);
    const [isAccountActionModalOpen, setAccountActionModalOpen] = useState(false);
    const [isDeleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'update'>('add');
    
    // Calendar transitions
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
    const [transitioningDay, setTransitioningDay] = useState<string | null>(null);

    // 3. Derived Data Processing
    const processedData = useTradeData(currentAccount);

    // 4. Synchronization Logic
    const { isSyncing, syncError, refreshAccount, setSyncError } = useSync(accounts, updateAccountTrades);
    
    // 5. PWA Integration
    const { 
        installPrompt, 
        launchedFileContent, 
        pwaError, 
        setLaunchedFileContent, 
        setPwaError,
        handleInstallClick 
    } = usePWA({ setView, setAddAccountModalOpen, setModalMode });

    // Combine errors
    const displayError = syncError || pwaError;
    const isDesktop = useMediaQuery('(min-width: 768px)');
    const { t } = useLanguage();

    // 6. Preload Lazy Components
    useEffect(() => {
        const preloadTimer = setTimeout(() => {
            // Main Views
            import('./components/Dashboard');
            import('./components/TradesList');
            import('./components/CalendarView');
            import('./components/GoalsView');
            import('./components/ProfileView');
            import('./components/AnalysisView');

            // Dashboard Components
            import('./components/BalanceChart');
            import('./components/RecentTradesTable');
            import('./components/OpenTradesTable');
            import('./components/DashboardMetricsBottom');

            // Modals
            import('./components/AddAccount');
            import('./components/AccountActionModal');
            import('./components/DayDetailModal');
            import('./components/DeleteConfirmationModal');
        }, 1500); // Wait 1.5s after mount to avoid blocking initial render

        return () => clearTimeout(preloadTimer);
    }, []);
    
    // Pull to Refresh Handler
    const handleRefresh = useCallback(() => {
        if (currentAccount) refreshAccount(currentAccount);
    }, [currentAccount, refreshAccount]);

    // Disable pull to refresh on TradesList and AnalysisView as they have internal scrolling
    const disablePTR = view === 'trades' || view === 'analysis';
    const { pullToRefreshRef, isRefreshing, pullDistance } = usePullToRefresh(handleRefresh, disablePTR);
    const PULL_THRESHOLD = 80;

    // Handlers for Account Modals
    const handleSaveAccountWrapper = (data: any, mode: 'add' | 'update') => {
        try {
            saveAccount(data, mode);
            setAddAccountModalOpen(false);
            if (mode === 'update' && data.dataUrl) {
                // Trigger sync immediately after update if URL provided
                const updatedAcc = accounts.find(a => a.name === data.name);
                if (updatedAcc) refreshAccount({ ...updatedAcc, ...data });
            }
        } catch (e: any) {
            // Pass error back to modal via a transient error state or alert
            // For now, setting main error
            setPwaError(e.message);
        }
    };
    
    const handleDeleteWrapper = () => {
        deleteAccount();
        setDeleteConfirmModalOpen(false);
    };

    const handleOpenAccountActions = () => setAccountActionModalOpen(true);
    const handleAddClick = () => { setModalMode('add'); setAddAccountModalOpen(true); setAccountActionModalOpen(false); };
    const handleUpdateClick = () => { setModalMode('update'); setAddAccountModalOpen(true); setAccountActionModalOpen(false); };
    const handleDeleteClick = () => { setDeleteConfirmModalOpen(true); setAccountActionModalOpen(false); };

    // View Transition Handlers
    const handleDayClick = (date: Date) => {
        // @ts-ignore
        if (!document.startViewTransition) {
            setSelectedCalendarDate(date);
            return;
        }
        setTransitioningDay(getDayIdentifier(date));
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

    // View Renderer with Skeletons
    const renderView = () => {
        // Show Skeleton if global loading or if we have an account but data isn't processed yet
        if (isLoading || (currentAccount && !processedData)) {
            switch(view) {
                case 'dashboard': return <DashboardSkeleton />;
                case 'trades': return <TradesListSkeleton />;
                case 'calendar': return <CalendarSkeleton />;
                case 'analysis': return <AnalysisSkeleton />;
                case 'goals': return <GenericSkeleton />;
                case 'profile': return <GenericSkeleton />;
                default: return <DashboardSkeleton />;
            }
        }

        if (!currentAccount || !processedData) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
                    <h1 className="text-3xl font-bold text-white mb-4">{t('app.welcome')}</h1>
                    <p className="text-gray-400 mb-8">{t('app.add_account_prompt')}</p>
                    <button onClick={handleAddClick} className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105">
                        {t('app.add_first_account_button')}
                    </button>
                </div>
            );
        }

        const commonProps = { currency: currentAccount.currency || 'USD' };

        switch(view) {
            case 'dashboard':
                return (
                     <div className="space-y-6">
                        <div className="animate-fade-in-up">
                            <Header metrics={processedData.metrics} accountName={currentAccount.name} lastUpdated={currentAccount.lastUpdated} onRefresh={handleRefresh} isSyncing={isSyncing} {...commonProps} />
                        </div>
                        <div className="animate-fade-in-up animation-delay-200">
                            <Dashboard metrics={processedData.metrics} {...commonProps} />
                        </div>
                        <div className="animate-fade-in-up animation-delay-300">
                           <BalanceChart data={processedData.chartData} onAdvancedAnalysisClick={() => setView('analysis')} initialBalance={currentAccount.initialBalance} goals={currentAccount.goals || {}} {...commonProps} />
                        </div>
                         {processedData.openTrades.length > 0 && (
                            <div className="animate-fade-in-up animation-delay-400">
                                <OpenTradesTable trades={processedData.openTrades} floatingPnl={processedData.metrics.floatingPnl} {...commonProps} />
                            </div>
                        )}
                        <div className="animate-fade-in-up animation-delay-500">
                            <RecentTradesTable trades={processedData.recentTrades} {...commonProps} />
                        </div>
                        <div className="animate-fade-in-up animation-delay-600">
                           <DashboardMetricsBottom metrics={processedData.metrics} {...commonProps} />
                        </div>
                    </div>
                );
            case 'trades': return <TradesList trades={processedData.closedTrades} {...commonProps} />;
            case 'calendar': return <CalendarView trades={processedData.closedTrades} onDayClick={handleDayClick} transitioningDay={transitioningDay} calendarSettings={calendarSettings} {...commonProps} />;
            case 'analysis': return <AnalysisView trades={processedData.closedTrades} initialBalance={currentAccount.initialBalance} onBackToDashboard={() => setView('dashboard')} {...commonProps} />;
            case 'goals': return <GoalsView metrics={processedData.metrics} accountGoals={currentAccount.goals || {}} onSaveGoals={saveGoals} {...commonProps} />;
            case 'profile': return <ProfileView canInstall={!!installPrompt} onInstallClick={handleInstallClick} notificationSettings={notificationSettings} onNotificationSettingsChange={setNotificationSettings} />;
            default: return null;
        }
    };
    
    // Determine the skeleton fallback for Suspense based on current view
    const getSuspenseFallback = () => {
         switch(view) {
            case 'dashboard': return <DashboardSkeleton />;
            case 'trades': return <TradesListSkeleton />;
            case 'calendar': return <CalendarSkeleton />;
            case 'analysis': return <AnalysisSkeleton />;
            default: return <GenericSkeleton />;
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
                                    <div className="app-region-no-drag">
                                        <Logo layout="mobile" />
                                    </div>
                                )}
                                <div className="app-region-no-drag">
                                    {!isLoading && accounts.length > 0 && <AccountSelector accountNames={accounts.map(a => a.name)} currentAccount={currentAccountName} onSelectAccount={setCurrentAccountName} onAddAccount={handleOpenAccountActions} />}
                                </div>
                            </div>
                        </div>
                    </header>
                    
                    <div className="flex-1 relative overflow-y-hidden">
                        {/* Pull-to-Refresh Indicator (Mobile Only) */}
                        {!isDesktop && !disablePTR && (
                            <div
                                className="absolute top-0 left-0 right-0 flex justify-center items-center z-0 pointer-events-none"
                                style={{
                                    height: '50px',
                                    transform: `translateY(${isRefreshing ? 0 : pullDistance - 50}px)`,
                                    transition: pullDistance === 0 && !isRefreshing ? 'transform 0.3s' : 'none',
                                    opacity: isRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1),
                                }}
                            >
                                <div className="p-3 bg-gray-800 rounded-full shadow-lg" style={{ transform: `rotate(${pullDistance * 2}deg) scale(${isRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1)})`, transition: 'transform 0.3s' }}>
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
                             <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 pb-24 md:pb-6 h-full">
                                {displayError && (
                                    <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                                        {displayError}
                                        <button className="ml-2 float-right font-bold" onClick={() => { setSyncError(null); setPwaError(null); }}>&times;</button>
                                    </div>
                                )}
                                <Suspense fallback={getSuspenseFallback()}>
                                    {renderView()}
                                </Suspense>
                            </div>
                        </main>
                    </div>
                    {!isDesktop && <BottomNav hasAccount={!!currentAccount} currentView={view} onNavigate={setView} calendarSettings={calendarSettings} onCalendarSettingsChange={setCalendarSettings} />}
                </div>
            </div>
            
            {/* Modals wrapped in Suspense */}
            <Suspense fallback={null}>
                <AddAccountModal 
                    isOpen={isAddAccountModalOpen} 
                    onClose={() => setAddAccountModalOpen(false)} 
                    onSaveAccount={handleSaveAccountWrapper}
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
                        currency={currentAccount?.currency || 'USD'}
                        transitioningDay={transitioningDay}
                    />
                )}
                <DeleteConfirmationModal 
                    isOpen={isDeleteConfirmModalOpen}
                    onClose={() => setDeleteConfirmModalOpen(false)}
                    onConfirm={handleDeleteWrapper}
                    accountName={currentAccount?.name || ''}
                />
            </Suspense>
        </>
    );
};

export default App;
