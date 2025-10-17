import React from 'react';
import { Trade } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface RecentTradesTableProps {
    trades: Trade[];
    currency: 'USD' | 'EUR';
}

const RecentTradesTable: React.FC<RecentTradesTableProps> = ({ trades, currency }) => {
    const { t, language } = useLanguage();

    const formatCurrency = (value: number) => {
        const symbol = currency === 'USD' ? '$' : '€';
        const sign = value >= 0 ? '+' : '-';
        const absNumberPart = new Intl.NumberFormat(language, {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(value));

        if (language === 'fr') {
            return `${sign}${absNumberPart}${symbol}`;
        }
        return `${sign}${symbol}${absNumberPart}`;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleString(language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return (
        <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.recent_trades_table_title')}</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
                        <tr>
                            <th scope="col" className="px-2 sm:px-4 py-3">{t('dashboard.symbol')}</th>
                            <th scope="col" className="px-2 sm:px-4 py-3">{t('dashboard.dates')}</th>
                            <th scope="col" className="px-2 sm:px-4 py-3">{t('dashboard.type')}</th>
                            <th scope="col" className="px-2 sm:px-4 py-3 text-right">{t('dashboard.size')}</th>
                            <th scope="col" className="px-2 sm:px-4 py-3 text-right">{t('dashboard.result')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trades.map((trade) => {
                            const isBuy = trade.type.toLowerCase() === 'buy';
                            const isProfit = trade.profit >= 0;
                            return (
                                <tr key={trade.ticket} className="border-b border-gray-800 text-xs align-top">
                                    <td className="px-2 sm:px-4 py-3 text-white">{trade.symbol}</td>
                                    <td className="px-2 sm:px-4 py-3 text-white leading-tight">
                                        <div className="sm:hidden">
                                            <div>{trade.closeTime.toLocaleDateString(language, { month: 'short', day: 'numeric' })}</div>
                                            <div className="text-gray-400">{trade.closeTime.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                                        </div>
                                        <span className="hidden sm:inline truncate">{formatDate(trade.closeTime)}</span>
                                    </td>
                                    <td className={`px-2 sm:px-4 py-3 font-bold uppercase ${isBuy ? 'text-cyan-400' : 'text-orange-400'}`}>{trade.type}</td>
                                    <td className="px-2 sm:px-4 py-3 text-right text-white">{trade.size}</td>
                                    <td className={`px-2 sm:px-4 py-3 text-right font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(trade.profit)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecentTradesTable;