import React, { useMemo } from 'react';
import { Trade } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

interface DayDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    trades: Trade[];
    date: Date;
    startOfDayBalance: number;
    currency: 'USD' | 'EUR';
}

const StatCard: React.FC<{ title: string; value: string; colorClass?: string; }> = ({ title, value, colorClass = 'text-white' }) => {
    return (
        <div className="bg-[#0c0b1e]/60 p-2 sm:p-4 rounded-lg text-center">
            <h4 className="text-sm font-medium text-gray-400 truncate">{title}</h4>
            <p className={`text-stat-value-sm sm:text-stat-value-md lg:text-stat-value font-bold mt-1 ${colorClass}`}>{value}</p>
        </div>
    );
};

const DayDetailModal: React.FC<DayDetailModalProps> = ({ isOpen, onClose, trades, date, startOfDayBalance, currency }) => {
    const { t, language } = useLanguage();
    useLockBodyScroll(isOpen);

    const dailyStats = useMemo(() => {
        if (!trades || trades.length === 0) {
            return { netProfit: 0, totalLotSize: 0, dailyReturn: 0 };
        }
        const netProfit = trades.reduce((sum, trade) => sum + (trade.profit + trade.commission + trade.swap), 0);
        const totalLotSize = trades.reduce((sum, trade) => sum + trade.size, 0);
        
        const dailyReturn = startOfDayBalance !== 0 ? (netProfit / startOfDayBalance) * 100 : 0;
        
        return { netProfit, totalLotSize, dailyReturn };
    }, [trades, startOfDayBalance]);

    const formatCurrency = (value: number) => {
        const symbol = currency === 'EUR' ? '€' : '$';
        const sign = value >= 0 ? '' : '-';
        
        // Use currency style for symbol and formatting, then manually construct with sign.
        const formattedValue = new Intl.NumberFormat(language, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(value));

        // Remove the currency symbol from formattedValue if it's there to avoid duplication
        const numberPart = formattedValue.replace(/[$€]/, '').trim();

        return `${sign}${numberPart}${symbol}`;
    };
    
    // Simplified formatting for the profit values in the table.
    const formatProfit = (value: number) => {
        const symbol = currency === 'EUR' ? '€' : '$';
        const sign = value >= 0 ? '+' : '';
        const formattedValue = new Intl.NumberFormat(language, {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);

        return `${sign}${formattedValue}${symbol}`;
    };

    if (!isOpen) return null;

    const netProfitColor = dailyStats.netProfit >= 0 ? 'text-green-400' : 'text-red-400';
    const formattedDate = date.toLocaleDateString(language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50" onClick={onClose}>
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] sm:w-full max-w-2xl p-4 sm:p-6 bg-[#16152c] border border-gray-700/50 rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <h2 className="text-modal-title font-bold text-white">
                        {t('day_modal.title', { date: formattedDate })}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
                </header>
                
                {/* Daily Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <StatCard title={t('day_modal.net_profit')} value={formatCurrency(dailyStats.netProfit)} colorClass={netProfitColor} />
                    <StatCard title={t('day_modal.total_lot_size')} value={dailyStats.totalLotSize.toFixed(2)} />
                    <StatCard title={t('day_modal.daily_return')} value={`${dailyStats.dailyReturn.toFixed(2)}%`} colorClass={dailyStats.dailyReturn >= 0 ? 'text-green-400' : 'text-red-400'}/>
                </div>

                {/* Trades Table */}
                <div className="overflow-y-auto flex-grow">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-[#0c0b1e] sticky top-0">
                            <tr>
                                <th scope="col" className="px-4 py-2">{t('day_modal.symbol')}</th>
                                <th scope="col" className="px-4 py-2">{t('day_modal.type')}</th>
                                <th scope="col" className="px-4 py-2 text-right">{t('day_modal.size')}</th>
                                <th scope="col" className="px-4 py-2 text-right">{t('day_modal.profit')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {trades.map((trade) => {
                                const isBuy = trade.type.toLowerCase() === 'buy';
                                const netProfit = trade.profit + trade.commission + trade.swap;
                                const isProfit = netProfit >= 0;
                                return (
                                    <tr key={trade.ticket} className="text-xs hover:bg-gray-800/50">
                                        <td className="px-4 py-2 font-medium text-white">{trade.symbol}</td>
                                        <td className={`px-4 py-2 font-bold uppercase ${isBuy ? 'text-cyan-400' : 'text-orange-400'}`}>{trade.type}</td>
                                        <td className="px-4 py-2 text-right text-white">{trade.size.toFixed(2)}</td>
                                        <td className={`px-4 py-2 text-right font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>{formatProfit(netProfit)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105"
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DayDetailModal;