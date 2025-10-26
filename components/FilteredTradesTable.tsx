import React from 'react';
import { Trade } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface FilteredTradesTableProps {
    trades: Trade[];
    currency: 'USD' | 'EUR';
}

const FilteredTradesTable: React.FC<FilteredTradesTableProps> = ({ trades, currency }) => {
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
        return date.toLocaleString(language, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const renderDate = (date: Date) => {
        return (
            <div className="leading-tight">
                <div className="sm:hidden">
                    <div>{date.toLocaleDateString(language, { month: 'short', day: 'numeric', year: '2-digit' })}</div>
                    <div className="text-gray-400">{date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                </div>
                <span className="hidden sm:inline whitespace-nowrap">{formatDate(date)}</span>
            </div>
        );
    };

    return (
        <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">{t('analysis.filtered_trades_title')} ({trades.length})</h3>
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase border-b border-gray-700 sticky top-0 bg-[#16152c]">
                        <tr>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">{t('dashboard.type')}</th>
                            <th scope="col" className="px-2 py-3 text-right whitespace-nowrap">{t('dashboard.size')}</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">{t('dashboard.symbol')}</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">{t('trades_list.col_close_time')}</th>
                            <th scope="col" className="px-2 py-3 text-right whitespace-nowrap">{t('dashboard.result')}</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">{t('trades_list.col_comment')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {trades.map((trade) => {
                            const isBuy = trade.type.toLowerCase() === 'buy';
                            const isProfit = trade.profit >= 0;
                            return (
                                <tr key={trade.ticket} className="text-xs hover:bg-gray-800/50">
                                    <td className={`px-2 py-3 font-bold uppercase ${isBuy ? 'text-cyan-400' : 'text-orange-400'}`}>{trade.type}</td>
                                    <td className="px-2 py-3 text-right text-white">{trade.size}</td>
                                    <td className="px-2 py-3 text-white">{trade.symbol}</td>
                                    <td className="px-2 py-3 text-white">{renderDate(trade.closeTime)}</td>
                                    <td className={`px-2 py-3 text-right font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(trade.profit)}</td>
                                    <td className="px-2 py-3 text-gray-400 truncate max-w-[100px] sm:max-w-xs" title={trade.comment}>{trade.comment}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {trades.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <p>{t('trades_list.no_trades_found')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilteredTradesTable;