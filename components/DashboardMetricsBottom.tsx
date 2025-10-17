import React from 'react';
import { DashboardMetrics } from '../types';
import StatCard from './StatCard';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardMetricsBottomProps {
  metrics: DashboardMetrics;
  currency: 'USD' | 'EUR';
}

const DashboardMetricsBottom: React.FC<DashboardMetricsBottomProps> = ({ metrics, currency }) => {
    const { language } = useLanguage();
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

    const totalFees = metrics.totalCommission + metrics.totalSwap;
  
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="animate-fade-in-up">
                <StatCard title="Total Capital" value={formatCurrency(metrics.totalBalance)} />
            </div>
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
    );
};

export default DashboardMetricsBottom;