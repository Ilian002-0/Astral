import React from 'react';
import { Trade } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface OpenTradesTableProps {
    trades: Trade[];
    floatingPnl: number;
    currency: 'USD' | 'EUR';
}

const OpenTradesTable: React.FC<OpenTradesTableProps> = ({ trades, floatingPnl, currency }) => {
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
            <h3 className="text-lg font-semibold text-white mb-4">{t('open_trades.title')} ({trades.length})</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left table-fixed">
                    <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
                        <tr>
                            <th scope="col" className="px-2 sm:px-4 py-3 w-[25%]">{t('trades_list.col_symbol')}</th>
                            <th scope="col" className="px-2 sm:px-4 py-3 w-[25%] sm:w-[30%]">{t('trades_list.col_open_time')}</th>
                            <th scope="col" className="px-2 sm:px-4 py-3 w-[15%]">{t('trades_list.col_type')}</th>
                            <th scope="col" className="px-2 sm:px-4 py-3 text-right w-[15%]">{t('trades_list.col_size')}</th>
                            <th scope="col" className="px-2 sm:px-4 py-3 text-right w-[20%] sm:w-[15%]">{t('trades_list.col_profit')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trades.map((trade) => {
                            const isBuy = trade.type.toLowerCase() === 'buy';
                            const netProfit = trade.profit + trade.commission + trade.swap;
                            const isProfit = netProfit >= 0;
                            return (
                                <tr key={trade.ticket} className="border-b border-gray-800 text-xs">
                                    <td className="px-2 sm:px-4 py-3 text-white truncate">{trade.symbol}</td>
                                    <td className="px-2 sm:px-4 py-3 text-white leading-tight">
                                        <div className="sm:hidden">
                                            <div>{trade.openTime.toLocaleDateString(language, { month: 'short', day: 'numeric' })}</div>
                                            <div className="text-gray-400">{trade.openTime.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                                        </div>
                                        <span className="hidden sm:inline truncate">{formatDate(trade.openTime)}</span>
                                    </td>
                                    <td className={`px-2 sm:px-4 py-3 font-bold uppercase truncate ${isBuy ? 'text-cyan-400' : 'text-orange-400'}`}>{trade.type}</td>
                                    <td className="px-2 sm:px-4 py-3 text-right text-white truncate">{trade.size}</td>
                                    <td className={`px-2 sm:px-4 py-3 text-right font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(netProfit)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                     <tfoot>
                        <tr className="font-semibold text-white">
                            <td colSpan={3} className="px-3 sm:px-6 py-4 text-base font-bold">{t('open_trades.total_floating_pnl')}</td>
                            <td colSpan={2} className={`px-3 sm:px-6 py-4 text-right text-base font-bold ${floatingPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrency(floatingPnl)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default OpenTradesTable;