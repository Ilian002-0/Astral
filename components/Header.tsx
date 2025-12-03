import React from 'react';
import { DashboardMetrics } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import AnimatedCounter from './AnimatedCounter';

interface HeaderProps {
    metrics: DashboardMetrics;
    accountName?: string;
    lastUpdated?: string;
    onRefresh?: () => void;
    isSyncing?: boolean;
    currency: 'USD' | 'EUR';
}

const SyncIcon: React.FC<{ isSyncing?: boolean }> = ({ isSyncing }) => (
<svg
  xmlns="http://www.w3.org/2000/svg"
  className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`}
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


const ShareIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
    </svg>
)

const Header: React.FC<HeaderProps> = ({ metrics, accountName, lastUpdated, onRefresh, isSyncing, currency }) => {
    const { t, language } = useLanguage();
    
    const formatCurrency = (value: number) => {
        const symbol = currency === 'USD' ? '$' : '€';
        const sign = value >= 0 ? '+' : '-';
        const numberPart = new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value));
        if (language === 'fr') {
            return `${sign}${numberPart}${symbol}`;
        }
        return `${sign}${symbol}${numberPart}`;
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

    const getSyncStatus = () => {
        if (isSyncing) {
            return {
                color: 'bg-blue-500',
                isPulsing: true,
            };
        }

        if (!lastUpdated) {
             return {
                color: 'bg-gray-500',
                isPulsing: false,
            };
        }

        const now = new Date();
        const lastUpdateDate = new Date(lastUpdated);
        const minutesAgo = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60);
        
        const STALE_THRESHOLD_MINUTES = 5;

        if (minutesAgo > STALE_THRESHOLD_MINUTES) {
            return {
                color: 'bg-yellow-500',
                isPulsing: false,
            };
        }

        return {
            color: 'bg-green-500',
            isPulsing: false,
        };
    };

    const syncStatus = getSyncStatus();
    
    // New logic for today's profit display
    const { lastDayProfit, lastDayProfitDaysAgo, todaysFloatingPnl, startOfDayBalance } = metrics;

    const profitFromTradesClosedToday = lastDayProfitDaysAgo === 0 ? lastDayProfit : 0;
    
    const displayValue = profitFromTradesClosedToday + (todaysFloatingPnl || 0);
    const displayLabel = t('header.profit_today');

    const percent = startOfDayBalance > 0 ? (displayValue / startOfDayBalance) * 100 : 0;
    
    const getColorClass = (val: number) => val >= 0 ? 'text-green-400' : 'text-red-400';
    
    return (
        <header className="bg-gradient-to-br from-teal-500/30 to-teal-600/30 p-6 rounded-3xl shadow-2xl border border-teal-500/20">
            <div className="flex justify-between items-start text-white mb-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold whitespace-nowrap">{accountName || 'Dashboard'}</h1>
                    {typeof navigator.share !== 'undefined' && (
                        <button onClick={handleShare} className="text-teal-200 hover:text-white transition-colors" aria-label="Share results">
                            <ShareIcon />
                        </button>
                    )}
                </div>
                <div className="text-right">
                    {onRefresh && (
                        <div className="flex items-center justify-end gap-3">
                            <span className="relative flex h-3 w-3" title={`Last update: ${formatRelativeTime(lastUpdated)}`}>
                                {syncStatus.isPulsing && <span className={`absolute inline-flex h-full w-full rounded-full ${syncStatus.color} animate-ping opacity-75`}></span>}
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${syncStatus.color}`}></span>
                            </span>
                            <button 
                                onClick={onRefresh} 
                                disabled={isSyncing} 
                                className="bg-teal-900/50 hover:bg-teal-900 p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-wait"
                                aria-label={t('header.sync_now')}
                            >
                                <SyncIcon isSyncing={isSyncing}/>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="text-center">
                <p className="text-sm text-teal-200">{displayLabel}</p>
                <p className="text-main-header font-black my-1">
                    <AnimatedCounter 
                        value={displayValue} 
                        format={formatCurrency} 
                        getColor={getColorClass}
                    />
                </p>
                <p className="text-lg font-bold">
                    <AnimatedCounter 
                        value={percent} 
                        format={(v) => `${v.toFixed(2)}%`}
                        getColor={getColorClass}
                    />
                </p>
            </div>
        </header>
    );
};

export default Header;