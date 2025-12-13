
import React, { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Strategy, Trade, ProcessedData } from '../types';
import BalanceChart from './BalanceChart';
import { processAccountData } from '../utils/calculations';

interface StrategyDetailViewProps {
    strategy: Strategy;
    trades: Trade[]; // Already filtered by strategy criteria
    initialBalance: number; // To calculate hypothetical growth
    currency: 'USD' | 'EUR';
    onBack: () => void;
}

const DetailedRow: React.FC<{ 
    label: string; 
    value: string | number; 
    isPositive?: boolean; 
    isNegative?: boolean; 
    subValue?: string;
}> = ({ label, value, isPositive, isNegative, subValue }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-700/50 last:border-0 hover:bg-gray-800/30 px-2 transition-colors">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <div className="text-right">
            <span className={`text-sm font-bold ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-white'}`}>
                {value}
            </span>
            {subValue && <span className="text-xs text-gray-500 ml-1">{subValue}</span>}
        </div>
    </div>
);

const StrategyDetailView: React.FC<StrategyDetailViewProps> = ({ strategy, trades, initialBalance, currency, onBack }) => {
    const { t, language } = useLanguage();

    // Calculate metrics on the fly for this strategy subset
    const processedData = useMemo(() => {
        if (!trades || trades.length === 0) return null;
        
        // We simulate an account object to reuse the calculation logic
        const mockAccount = {
            name: strategy.name,
            trades: trades,
            initialBalance: initialBalance, 
            currency
        };

        return processAccountData(mockAccount);
    }, [trades, strategy.name, currency, initialBalance]);

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

    if (!processedData) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-gray-400">No trades found for this strategy yet.</p>
                <button onClick={onBack} className="px-6 py-2 bg-gray-700 rounded-2xl text-white">Back</button>
            </div>
        );
    }

    const { metrics, chartData } = processedData;

    return (
        <div className="space-y-6 pb-24 md:pb-12 animate-fade-in-up">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3 overflow-hidden">
                    <button onClick={onBack} className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-2xl font-bold text-white truncate">{strategy.name}</h2>
                        {strategy.criteria.comment && (
                            <p className="text-sm text-gray-400 truncate">Filter: <span className="text-cyan-400">{strategy.criteria.comment}</span></p>
                        )}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="animate-fade-in-up animation-delay-100">
                <BalanceChart 
                    data={chartData} 
                    initialBalance={initialBalance} 
                    currency={currency} 
                    goals={{}}
                    hideControls={true}
                />
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-fade-in-up animation-delay-200">
                
                {/* Column 1: Financials */}
                <div className="bg-[#16152c] rounded-3xl p-6 border border-gray-700/50 shadow-lg h-fit">
                    <h3 className="text-white font-bold mb-4 pb-2 border-b border-gray-700 text-lg">Financial Performance</h3>
                    <DetailedRow 
                        label={t('metrics.total_profit')} 
                        value={formatCurrency(metrics.netProfit)} 
                        isPositive={metrics.netProfit >= 0} 
                        isNegative={metrics.netProfit < 0} 
                    />
                    <DetailedRow 
                        label={t('metrics.gross_profit')} 
                        value={formatCurrency(metrics.grossProfit)} 
                        isPositive 
                    />
                    <DetailedRow 
                        label={t('metrics.gross_loss')} 
                        value={formatCurrency(metrics.grossLoss)} 
                        isNegative 
                    />
                    <DetailedRow 
                        label={t('metrics.profit_factor')} 
                        value={metrics.profitFactor !== null ? metrics.profitFactor.toFixed(2) : '∞'} 
                    />
                    <DetailedRow 
                        label={t('metrics.expected_payoff')} 
                        value={formatCurrency(metrics.expectedPayoff)} 
                    />
                </div>

                {/* Column 2: Trade Stats */}
                <div className="bg-[#16152c] rounded-3xl p-6 border border-gray-700/50 shadow-lg h-fit">
                    <h3 className="text-white font-bold mb-4 pb-2 border-b border-gray-700 text-lg">Trade Statistics</h3>
                    <DetailedRow 
                        label={t('metrics.total_orders')} 
                        value={metrics.totalOrders} 
                    />
                    <DetailedRow 
                        label={t('metrics.short_positions')} 
                        value={metrics.shortPositions.count}
                        subValue={`(${metrics.shortPositions.winRate.toFixed(2)}%)`}
                    />
                    <DetailedRow 
                        label={t('metrics.long_positions')} 
                        value={metrics.longPositions.count}
                        subValue={`(${metrics.longPositions.winRate.toFixed(2)}%)`}
                    />
                    <DetailedRow 
                        label={t('dashboard.winning_trades')} 
                        value={`${metrics.winningTrades} (${metrics.winRate.toFixed(2)}%)`}
                        isPositive
                    />
                    <DetailedRow 
                        label={t('dashboard.losing_trades')} 
                        value={`${metrics.losingTrades} (${(100 - metrics.winRate).toFixed(2)}%)`}
                        isNegative
                    />
                </div>

                {/* Column 3: Extremes */}
                <div className="bg-[#16152c] rounded-3xl p-6 border border-gray-700/50 shadow-lg h-fit">
                    <h3 className="text-white font-bold mb-4 pb-2 border-b border-gray-700 text-lg">Extremes & Averages</h3>
                    <DetailedRow 
                        label={t('metrics.largest_profit_trade')} 
                        value={formatCurrency(metrics.largestProfitTrade)} 
                        isPositive
                    />
                    <DetailedRow 
                        label={t('metrics.largest_loss_trade')} 
                        value={formatCurrency(metrics.largestLossTrade)} 
                        isNegative
                    />
                    <DetailedRow 
                        label={t('metrics.average_win')} 
                        value={formatCurrency(metrics.averageWin)} 
                        isPositive
                    />
                    <DetailedRow 
                        label={t('metrics.average_loss')} 
                        value={formatCurrency(metrics.averageLoss)} 
                        isNegative
                    />
                </div>

                {/* Column 4: Risks & Streaks */}
                <div className="bg-[#16152c] rounded-3xl p-6 border border-gray-700/50 shadow-lg h-fit">
                    <h3 className="text-white font-bold mb-4 pb-2 border-b border-gray-700 text-lg">Risk & Streaks</h3>
                    <DetailedRow 
                        label={t('metrics.max_drawdown')} 
                        value={formatCurrency(metrics.maxDrawdown.absolute)} 
                        subValue={`(${metrics.maxDrawdown.percentage.toFixed(2)}%)`}
                        isNegative
                    />
                    <DetailedRow 
                        label={t('metrics.consecutive_wins')} 
                        value={metrics.maxConsecutiveWins} 
                        isPositive
                    />
                    <DetailedRow 
                        label={t('metrics.consecutive_losses')} 
                        value={metrics.maxConsecutiveLosses} 
                        isNegative
                    />
                </div>
            </div>
        </div>
    );
};

export default StrategyDetailView;
