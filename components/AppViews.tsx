
import React, { Suspense } from 'react';
import { Account, AppView, CalendarSettings, NotificationSettings, ProcessedData, Strategy } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import Header from './Header';
import { 
    DashboardSkeleton, 
    TradesListSkeleton, 
    CalendarSkeleton, 
    AnalysisSkeleton, 
    GenericSkeleton 
} from './Skeletons';

// Lazy Imports
const Dashboard = React.lazy(() => import('./Dashboard'));
const BalanceChart = React.lazy(() => import('./BalanceChart'));
const RecentTradesTable = React.lazy(() => import('./RecentTradesTable'));
const OpenTradesTable = React.lazy(() => import('./OpenTradesTable'));
const DashboardMetricsBottom = React.lazy(() => import('./DashboardMetricsBottom'));
const TradesList = React.lazy(() => import('./TradesList'));
const CalendarView = React.lazy(() => import('./CalendarView'));
const AnalysisView = React.lazy(() => import('./AnalysisView'));
const GoalsView = React.lazy(() => import('./GoalsView'));
const StrategyView = React.lazy(() => import('./StrategyView'));
const StrategyDetailView = React.lazy(() => import('./StrategyDetailView'));

interface AppViewsProps {
    view: AppView;
    isLoading: boolean;
    currentAccount: Account | null;
    processedData: ProcessedData | null;
    isSyncing: boolean;
    handleRefresh: () => void;
    setView: (view: AppView) => void;
    saveGoals: (goals: any) => void;
    installPrompt: any;
    handleInstallClick: () => void;
    notificationSettings: NotificationSettings;
    setNotificationSettings: (s: NotificationSettings) => void;
    calendarSettings: CalendarSettings;
    onCalendarSettingsChange: (s: CalendarSettings) => void;
    handleDayClick: (date: Date) => void;
    transitioningDay: string | null;
    handleAddClick: () => void;
    onLogout: () => void;
    strategies: Strategy[];
    saveStrategy: (s: any) => void;
    deleteStrategy: (id: string) => void;
    selectedStrategyId: string | null;
    onStrategySelect: (strategy: Strategy) => void;
}

const AppViews: React.FC<AppViewsProps> = ({
    view,
    isLoading,
    currentAccount,
    processedData,
    isSyncing,
    handleRefresh,
    setView,
    saveGoals,
    installPrompt,
    handleInstallClick,
    notificationSettings,
    setNotificationSettings,
    calendarSettings,
    onCalendarSettingsChange,
    handleDayClick,
    transitioningDay,
    handleAddClick,
    onLogout,
    strategies,
    saveStrategy,
    deleteStrategy,
    selectedStrategyId,
    onStrategySelect
}) => {
    const { t } = useLanguage();

    // Show Skeleton if global loading or if we have an account but data isn't processed yet
    if (isLoading || (currentAccount && !processedData)) {
        switch(view) {
            case 'dashboard': return <DashboardSkeleton />;
            case 'trades': return <TradesListSkeleton />;
            case 'calendar': return <CalendarSkeleton />;
            case 'analysis': return <AnalysisSkeleton />;
            case 'goals': return <GenericSkeleton />;
            case 'strategy': return <GenericSkeleton />;
            case 'strategy-detail': return <GenericSkeleton />;
            default: return <DashboardSkeleton />;
        }
    }

    if (!currentAccount || !processedData) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
                <h1 className="text-3xl font-bold text-white mb-4">{t('app.welcome')}</h1>
                <p className="text-gray-400 mb-8">{t('app.add_account_prompt')}</p>
                <button onClick={handleAddClick} className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-lg transition-transform transform hover:scale-105">
                    {t('app.add_first_account_button')}
                </button>
            </div>
        );
    }

    const commonProps = { currency: currentAccount.currency || 'USD' };

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
        <Suspense fallback={getSuspenseFallback()}>
            {(() => {
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
                    case 'analysis': return <AnalysisView trades={processedData.closedTrades} initialBalance={currentAccount.initialBalance} onBackToDashboard={() => setView('dashboard')} strategies={strategies} {...commonProps} />;
                    case 'goals': return <GoalsView metrics={processedData.metrics} accountGoals={currentAccount.goals || {}} onSaveGoals={saveGoals} {...commonProps} />;
                    case 'strategy': return <StrategyView processedData={processedData} initialBalance={currentAccount.initialBalance} onLogout={onLogout} strategies={strategies} onSaveStrategy={saveStrategy} onDeleteStrategy={deleteStrategy} onStrategySelect={onStrategySelect} {...commonProps} />;
                    case 'strategy-detail': 
                        const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);
                        if (!selectedStrategy) {
                            setView('strategy'); // Fallback
                            return null;
                        }
                        const filteredTrades = processedData.closedTrades.filter(t => 
                            selectedStrategy.criteria.comment ? t.comment === selectedStrategy.criteria.comment : true
                        );
                        return (
                            <StrategyDetailView 
                                strategy={selectedStrategy}
                                trades={filteredTrades}
                                initialBalance={currentAccount.initialBalance}
                                onBack={() => window.history.back()}
                                {...commonProps} 
                            />
                        );
                    default: return null;
                }
            })()}
        </Suspense>
    );
};

export default AppViews;
