import React from 'react';
import { DashboardMetrics } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
    metrics: DashboardMetrics;
    accountName?: string;
    lastUpdated?: string;
    onRefresh?: () => void;
    isSyncing?: boolean;
}

const SyncIcon: React.FC<{isSyncing?: boolean}> = ({ isSyncing }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 10M20 20l-1.5-1.5A9 9 0 003.5 14" />
    </svg>
)

const ShareIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
    </svg>
)

const Header: React.FC<HeaderProps> = ({ metrics, accountName, lastUpdated, onRefresh, isSyncing }) => {
    const { t, language } = useLanguage();
    
    const formatCurrency = (value: number) => {
        const sign = value >= 0 ? '+' : '-';
        return `${sign}$${new Intl.NumberFormat(language, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(value))}`;
    };

    const formatRelativeTime = (isoDate?: string): string => {
        if (!isoDate) return 'never';
        const date = new Date(isoDate);
        const now = new Date();
        const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
        const minutes = Math.round(seconds / 60);

        if (seconds < 60) return `a few seconds ago`;
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
    }

    const handleShare = async () => {
        const shareData = {
            title: `My Trading Results: ${accountName}`,
            text: `Check out my trading performance!
Net Profit: ${formatCurrency(metrics.netProfit)}
Win Rate: ${metrics.winRate.toFixed(2)}%
Profit Factor: ${metrics.profitFactor ? metrics.profitFactor.toFixed(2) : 'N/A'}
Tracked with Atlas.`,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                alert('Web Share API is not supported in your browser.');
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const getDynamicDayLabel = (daysAgo: number): string => {
        if (daysAgo === 0) return t('header.profit_today');
        if (daysAgo === 1) return t('header.profit_yesterday');
        return t('header.profit_x_days_ago', { count: daysAgo });
    };

    const { lastDayProfit, lastDayProfitDaysAgo } = metrics;
    const resultLabel = getDynamicDayLabel(lastDayProfitDaysAgo);
    const resultColor = lastDayProfit >= 0 ? 'text-green-400' : 'text-red-400';
    const balanceBeforeLastDay = metrics.totalBalance - lastDayProfit;
    const percent = balanceBeforeLastDay > 0 ? (lastDayProfit / balanceBeforeLastDay) * 100 : 0;


    const getSyncStatus = () => {
        if (isSyncing) {
            return {
                color: 'bg-blue-500',
                text: t('header.syncing'),
                isPulsing: true,
            };
        }

        if (!lastUpdated) {
             return {
                color: 'bg-gray-500',
                text: 'Never updated',
                isPulsing: false,
            };
        }

        const now = new Date();
        const lastUpdateDate = new Date(lastUpdated);
        const minutesAgo = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60);
        
        const STALE_THRESHOLD_MINUTES = 15;

        if (minutesAgo > STALE_THRESHOLD_MINUTES) {
            return {
                color: 'bg-yellow-500',
                text: formatRelativeTime(lastUpdated),
                isPulsing: false,
            };
        }

        return {
            color: 'bg-green-500',
            text: formatRelativeTime(lastUpdated),
            isPulsing: false,
        };
    };

    const syncStatus = getSyncStatus();
    
    return (
        <header className="bg-gradient-to-br from-teal-500/30 to-teal-600/30 p-6 rounded-3xl shadow-2xl border border-teal-500/20">
            <div className="flex justify-between items-start text-white mb-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold">{accountName || 'Dashboard'}</h1>
                    {typeof navigator.share !== 'undefined' && (
                        <button onClick={handleShare} className="text-teal-200 hover:text-white transition-colors" aria-label="Share results">
                            <ShareIcon />
                        </button>
                    )}
                </div>
                <div className="text-right">
                    {onRefresh ? (
                        <>
                            <button onClick={onRefresh} disabled={isSyncing} className="flex items-center gap-2 text-sm bg-teal-900/50 hover:bg-teal-900 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait">
                                <SyncIcon isSyncing={isSyncing}/>
                                <span>{isSyncing ? t('header.syncing') : t('header.sync_now')}</span>
                            </button>
                             <div className="flex items-center justify-end text-xs opacity-70 mt-1.5 gap-2">
                                <span className="relative flex h-2 w-2">
                                    {syncStatus.isPulsing && <span className={`absolute inline-flex h-full w-full rounded-full ${syncStatus.color} animate-ping opacity-75`}></span>}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${syncStatus.color}`}></span>
                                </span>
                                <span>{t('header.last_update')}: {syncStatus.text}</span>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs opacity-70 mt-1">{t('header.last_update')}: {formatRelativeTime(lastUpdated)}</p>
                    )}
                </div>
            </div>
            <div className="text-center">
                <p className="text-sm text-teal-200">{resultLabel}</p>
                <p className={`text-main-header font-black my-1 ${resultColor}`}>{formatCurrency(lastDayProfit)}</p>
                <p className={`text-lg font-bold ${resultColor}`}>{percent.toFixed(2)}%</p>
            </div>
        </header>
    );
};

export default Header;