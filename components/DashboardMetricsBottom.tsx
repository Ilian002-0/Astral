
import React from 'react';
import { DashboardMetrics } from '../types';
import StatCard from './StatCard';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardMetricsBottomProps {
  metrics: DashboardMetrics;
  currency: 'USD' | 'EUR';
}

const DashboardMetricsBottom: React.FC<DashboardMetricsBottomProps> = ({ metrics, currency }) => {
    const { t, language } = useLanguage();
    
    const formatCurrency = (value: number) => {
        const symbol = currency === 'USD' ? '$' : '€';
        if (language === 'fr') {
            const numberPart = new Intl.NumberFormat('fr', {
                style: 'decimal',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(value);
            return `${numberPart}${symbol}`;
        }
        
        return new Intl.NumberFormat(language, {
            style: 'currency',
            currency: currency,
            currencyDisplay: 'symbol',
        }).format(value);
    };

    const formatTotalCapital = (value: number) => {
        const symbol = currency === 'USD' ? '$' : '€';
        const numberPart = new Intl.NumberFormat(language, {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
        if (language === 'fr') {
            return `${numberPart}${symbol}`;
        }
        return `${symbol}${numberPart}`;
    };

    const totalFees = metrics.totalCommission + metrics.totalSwap;
  
    return (
        <div className="space-y-6">
            <div className="bg-[#16152c] p-4 sm:p-6 rounded-3xl shadow-lg border border-gray-700/50 animate-fade-in-up">
                <div className="flex justify-between items-center">
                    <p className="text-base font-bold text-white">{t('dashboard.total_capital')}</p>
                    <p className="text-2xl font-bold text-white">{formatTotalCapital(metrics.totalBalance)}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div className="animate-fade-in-up animation-delay-100">
                    <StatCard title="Average Win" value={formatCurrency(metrics.averageWin)} colorClass="text-green-400"/>
                </div>
                <div className="animate-fade-in-up animation-delay-200">
                    <StatCard title="Average Loss" value={formatCurrency(metrics.averageLoss)} colorClass="text-red-400"/>
                </div>
                <div className="animate-fade-in-up animation-delay-300">
                    <StatCard title="Total Fees" value={formatCurrency(totalFees)} tooltip="Commissions + Swap" />
                </div>
                <div className="animate-fade-in-up animation-delay-400">
                    <StatCard title="Gross Profit" value={formatCurrency(metrics.grossProfit)} colorClass="text-green-400" />
                </div>
                <div className="animate-fade-in-up animation-delay-500">
                    <StatCard title="Gross Loss" value={formatCurrency(Math.abs(metrics.grossLoss))} colorClass="text-red-400" />
                </div>
            </div>
        </div>
    );
};

export default DashboardMetricsBottom;
