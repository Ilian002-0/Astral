
import React, { useMemo, useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import { Strategy, Trade, DashboardMetrics, MaxDrawdown } from '../types';
import BalanceChart from './BalanceChart';
import { processAccountData } from '../utils/calculations';

interface StrategyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    strategy: Strategy;
    trades: Trade[]; // Already filtered by strategy criteria
    initialBalance: number; // To calculate hypothetical growth
    currency: 'USD' | 'EUR';
    originRect?: DOMRect | null;
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

const StrategyDetailModal: React.FC<StrategyDetailModalProps> = ({ isOpen, onClose, strategy, trades, initialBalance, currency, originRect }) => {
    const { t, language } = useLanguage();
    useLockBodyScroll(isOpen);
    const [isVisible, setIsVisible] = useState(false);

    // Calculate metrics on the fly for this strategy subset
    const processedData = useMemo(() => {
        if (!trades || trades.length === 0) return null;
        
        // We simulate an account object to reuse the calculation logic
        // Use the actual account's initial balance to make drawdown % meaningful relative to capital
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

    // Animation Logic
    useEffect(() => {
        let timeoutId: number;
        if (isOpen) {
            // Trigger animation start
            timeoutId = window.setTimeout(() => {
                setIsVisible(true);
            }, 10);
        } else {
            setIsVisible(false);
        }
        return () => clearTimeout(timeoutId);
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        // Wait for animation to finish before calling parent close
        setTimeout(() => {
            onClose();
        }, 300);
    };

    // Calculate transform origin based on the clicked card's position
    const transformStyle = useMemo(() => {
        if (!originRect || typeof window === 'undefined') return {};

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const originX = originRect.left + originRect.width / 2;
        const originY = originRect.top + originRect.height / 2;
        const deltaX = originX - centerX;
        const deltaY = originY - centerY;

        return {
            transformOrigin: `calc(50% + ${deltaX}px) calc(50% + ${deltaY}px)`
        };
    }, [originRect]);

    if (!isOpen || !processedData) return null;

    const { metrics, chartData } = processedData;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isVisible ? '' : 'pointer-events-none'}`}>
            <div 
                className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ease-ios ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            ></div>

            <div 
                className={`relative w-full max-w-5xl p-0 bg-[#16152c] border border-gray-700/50 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] transition-all duration-300 ease-ios overflow-hidden ${isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                onClick={e => e.stopPropagation()}
                style={transformStyle}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 bg-[#16152c] shrink-0 z-10">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">{strategy.name}</h2>
                        {strategy.criteria.comment && (
                            <p className="text-sm text-gray-400 mt-1">Filter: <span className="text-cyan-400">{strategy.criteria.comment}</span></p>
                        )}
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 bg-[#0c0b1e]">
                    <div className="p-6">
                        {/* Chart */}
                        <div className="mb-8 bg-[#16152c] rounded-3xl p-1 shadow-lg border border-gray-700/30">
                            <BalanceChart 
                                data={chartData} 
                                initialBalance={initialBalance} 
                                currency={currency} 
                                goals={{}} 
                            />
                        </div>

                        {/* Detailed Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            
                            {/* Column 1: Financials */}
                            <div className="bg-[#16152c] rounded-2xl p-4 border border-gray-700/30 shadow-md h-fit">
                                <h3 className="text-white font-bold mb-4 pb-2 border-b border-gray-700">Financial Performance</h3>
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
                            <div className="bg-[#16152c] rounded-2xl p-4 border border-gray-700/30 shadow-md h-fit">
                                <h3 className="text-white font-bold mb-4 pb-2 border-b border-gray-700">Trade Statistics</h3>
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
                            <div className="bg-[#16152c] rounded-2xl p-4 border border-gray-700/30 shadow-md h-fit">
                                <h3 className="text-white font-bold mb-4 pb-2 border-b border-gray-700">Extremes & Averages</h3>
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
                            <div className="bg-[#16152c] rounded-2xl p-4 border border-gray-700/30 shadow-md h-fit">
                                <h3 className="text-white font-bold mb-4 pb-2 border-b border-gray-700">Risk & Streaks</h3>
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
                </div>
            </div>
        </div>
    );
};

export default StrategyDetailModal;
