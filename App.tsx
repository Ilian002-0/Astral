import React, { useState, useCallback, useEffect } from 'react';
import { Account, AppView, CalendarSettings, NotificationSettings } from './types';
import { getDayIdentifier } from './utils/calendar';
import useMediaQuery from './hooks/useMediaQuery';
import usePullToRefresh from './hooks/usePullToRefresh';
import useDBStorage from './hooks/useLocalStorage';

// Custom Hooks
import { useAccountManager } from './hooks/useAccountManager';
import { useSync } from './hooks/useSync';
import { usePWA } from './hooks/usePWA';
import { useTradeData } from './hooks/useTradeData';
import { useAuth } from './contexts/AuthContext';

// Static Imports (Layout & critical UI)
import AccountSelector from './components/AccountSelector';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import Logo from './components/Logo';
import { SyncIcon } from './components/SyncIcon';
import AppViews from './components/AppViews';
import AppModals from './components/AppModals';
import Login from './components/Login';

const App: React.FC = () => {
    // Auth Check
    const { user, loading: authLoading, logout } = useAuth();
    const [isGuest, setIsGuest] = useState(false);

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

    const handleLogout = async () => {
        setIsGuest(false);
        await logout();
    };

    if (authLoading) {
        return <div className="min-h-screen bg-[#0c0b1e] flex items-center justify-center text-white">Loading...</div>;
    }

    // Show Login if not authenticated AND not in guest mode
    if (!user && !isGuest) {
        return <Login onGuestLogin={() => setIsGuest(true)} />;
    }

    return (
        <>
            <div className="flex h-screen overflow-hidden">
                {isDesktop && <Sidebar currentView={view} onNavigate={setView} canInstall={!!installPrompt} onInstallClick={handleInstallClick} />}
                <div className="flex-1 flex flex-col w-full">
                    <header className="flex-shrink-0 z-10 bg-[#0c0b1e] shadow-lg shadow-black/30 app-region-drag">
                        <div className="max-w-4xl mx-auto px-4 md:px-6" style={{ paddingTop: 'env(titlebar-area-height, 0)'}}>
                            <div className={`flex ${!isDesktop ? 'justify-between' : 'justify-end'} items-center h-20`}>
                                {!isDesktop && (
                                    <div className="app-region-no-drag">
                                        <Logo layout="mobile" />
                                    </div>
                                )}
                                <div className="app-region-no-drag flex items-center gap-4">
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
                             <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 pb-20 md:pb-6 min-h-full">
                                {displayError && (
                                    <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                                        {displayError}
                                        <button className="ml-2 float-right font-bold" onClick={() => { setSyncError(null); setPwaError(null); }}>&times;</button>
                                    </div>
                                )}
                                
                                <AppViews 
                                    view={view}
                                    isLoading={isLoading}
                                    currentAccount={currentAccount}
                                    processedData={processedData}
                                    isSyncing={isSyncing}
                                    handleRefresh={handleRefresh}
                                    setView={setView}
                                    saveGoals={saveGoals}
                                    installPrompt={installPrompt}
                                    handleInstallClick={handleInstallClick}
                                    notificationSettings={notificationSettings}
                                    setNotificationSettings={setNotificationSettings}
                                    calendarSettings={calendarSettings}
                                    onCalendarSettingsChange={setCalendarSettings}
                                    handleDayClick={handleDayClick}
                                    transitioningDay={transitioningDay}
                                    handleAddClick={handleAddClick}
                                    onLogout={handleLogout}
                                />
                            </div>
                        </main>
                    </div>
                    {!isDesktop && <BottomNav hasAccount={!!currentAccount} currentView={view} onNavigate={setView} calendarSettings={calendarSettings} onCalendarSettingsChange={setCalendarSettings} />}
                </div>
            </div>
            
            <AppModals 
                isAddAccountModalOpen={isAddAccountModalOpen}
                setAddAccountModalOpen={setAddAccountModalOpen}
                isAccountActionModalOpen={isAccountActionModalOpen}
                setAccountActionModalOpen={setAccountActionModalOpen}
                isDeleteConfirmModalOpen={isDeleteConfirmModalOpen}
                setDeleteConfirmModalOpen={setDeleteConfirmModalOpen}
                modalMode={modalMode}
                currentAccount={currentAccount}
                handleSaveAccountWrapper={handleSaveAccountWrapper}
                launchedFileContent={launchedFileContent}
                setLaunchedFileContent={setLaunchedFileContent}
                handleAddClick={handleAddClick}
                handleUpdateClick={handleUpdateClick}
                handleDeleteClick={handleDeleteClick}
                handleDeleteWrapper={handleDeleteWrapper}
                selectedCalendarDate={selectedCalendarDate}
                handleCloseDayModal={handleCloseDayModal}
                processedData={processedData}
                transitioningDay={transitioningDay}
            />
        </>
    );
};

export default App;