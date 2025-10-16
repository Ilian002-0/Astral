import React from 'react';
import { DashboardMetrics } from '../types';
import StatCard from './StatCard';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  metrics: DashboardMetrics;
}

const Dashboard: React.FC<DashboardProps> = ({ metrics }) => {
  const { t } = useLanguage();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };
  
  const netProfitColor = metrics.netProfit >= 0 ? 'text-green-400' : 'text-red-400';
  const floatingPnlColor = metrics.floatingPnl >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="animate-fade-in-up animation-delay-200">
                <StatCard title={t('metrics.total_profit')} value={formatCurrency(metrics.netProfit)} colorClass={netProfitColor} tooltip="Total Profit - (Commission + Swap)"/>
            </div>
            <div className="animate-fade-in-up animation-delay-300">
                <StatCard title={t('metrics.floating_pnl')} value={formatCurrency(metrics.floatingPnl)} colorClass={floatingPnlColor} />
            </div>
            <div className="animate-fade-in-up animation-delay-400">
                <StatCard title={t('metrics.win_rate')} value={`${metrics.winRate.toFixed(2)}%`} colorClass={metrics.winRate >= 50 ? 'text-cyan-400' : 'text-yellow-400'}/>
            </div>
            <div className="animate-fade-in-up animation-delay-500">
                <StatCard title={t('metrics.total_orders')} value={metrics.totalOrders.toString()} />
            </div>
            <div className="animate-fade-in-up animation-delay-600">
                <StatCard title={t('metrics.profit_factor')} value={isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞'} tooltip="Gross Profit / Gross Loss"/>
            </div>
        </div>
        <div className="p-6 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700/50 flex justify-around items-center animate-fade-in-up animation-delay-700">
            <div>
                <h3 className="text-sm font-medium text-gray-400 text-center">{t('dashboard.winning_trades')}</h3>
                <p className="text-3xl font-bold text-green-400 text-center mt-2">{metrics.winningTrades}</p>
            </div>
            <div className="h-16 w-px bg-gray-600"></div>
            <div>
                <h3 className="text-sm font-medium text-gray-400 text-center">{t('dashboard.losing_trades')}</h3>
                <p className="text-3xl font-bold text-red-400 text-center mt-2">{metrics.losingTrades}</p>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;