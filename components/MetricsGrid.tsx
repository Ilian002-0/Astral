import React from 'react';
import { DashboardMetrics } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MetricsGridProps {
  metrics: DashboardMetrics;
}

const StatCard: React.FC<{ title: string; value: string | number; subValue?: string; icon: React.ReactNode; positive?: boolean; negative?: boolean; }> = ({ title, value, subValue, icon, positive, negative }) => (
  <div className="bg-[#16152c] p-4 rounded-2xl shadow-lg border border-gray-700/50 flex items-center space-x-4">
    <div className={`p-3 rounded-lg ${positive ? 'bg-green-500/10 text-green-400' : negative ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
        {icon}
    </div>
    <div>
        <h4 className="text-sm text-gray-400">{title}</h4>
        <p className="text-xl font-bold text-white">{value}</p>
        {subValue && <p className={`text-xs ${negative ? 'text-red-400' : 'text-gray-500'}`}>{subValue}</p>}
    </div>
  </div>
);

// Icons defined here for simplicity
const TotalProfitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>;
const ProfitFactorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-6m-3 6v-3m-3 3h.01M12 3a9 9 0 11-9 9 9 9 0 019-9z" /></svg>;
const MaxDrawdownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>;
const TotalBalanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>;
const TotalDepositsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const WinRateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const AverageWinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const AverageLossIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>;
const TotalOrdersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;


const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  const { t, language } = useLanguage();
  const formatCurrency = (value: number) => `$${new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  const formatCompact = (value: number) => `$${new Intl.NumberFormat(language, { notation: 'compact', compactDisplay: 'short' }).format(value)}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard title={t('metrics.total_profit')} value={formatCurrency(metrics.netProfit)} icon={<TotalProfitIcon />} positive={metrics.netProfit >= 0} negative={metrics.netProfit < 0} />
      <StatCard title={t('metrics.profit_factor')} value={metrics.profitFactor?.toFixed(2) || '∞'} icon={<ProfitFactorIcon />} positive/>
      <StatCard title={t('metrics.max_drawdown')} value={`${metrics.maxDrawdown.percentage.toFixed(2)}%`} subValue={formatCurrency(metrics.maxDrawdown.absolute * -1)} icon={<MaxDrawdownIcon />} negative />
      <StatCard title={t('metrics.total_balance')} value={formatCompact(metrics.totalBalance)} icon={<TotalBalanceIcon />} />
      <StatCard title={t('metrics.total_deposits')} value={formatCompact(metrics.totalDeposits)} icon={<TotalDepositsIcon />} />
      <StatCard title={t('metrics.average_win')} value={formatCurrency(metrics.averageWin)} icon={<AverageWinIcon />} positive />
      <StatCard title={t('metrics.average_loss')} value={formatCurrency(metrics.averageLoss)} icon={<AverageLossIcon />} negative />
      <StatCard title={t('metrics.win_rate')} value={`${metrics.winRate.toFixed(2)}%`} icon={<WinRateIcon />} positive={metrics.winRate >= 50} negative={metrics.winRate < 50} />
      <StatCard title={t('metrics.total_orders')} value={metrics.totalOrders} icon={<TotalOrdersIcon />} />
    </div>
  );
};

export default MetricsGrid;