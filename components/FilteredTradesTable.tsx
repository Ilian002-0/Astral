
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trade } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import useDBStorage from '../hooks/useLocalStorage';

type AugmentedTrade = Trade & { profitPercentage?: number };

interface FilteredTradesTableProps {
    trades: AugmentedTrade[];
    currency: 'USD' | 'EUR';
}

const calculatePips = (trade: Trade): number => {
    if (trade.openPrice === 0 || trade.closePrice === 0) return 0;

    const priceString = trade.openPrice.toString();
    const decimalIndex = priceString.indexOf('.');
    
    let pipValue;
    if (decimalIndex === -1) {
        // e.g. US30 index price like 39000. A "pip" is a full point.
        pipValue = 1.0; 
    } else {
        const numDecimals = priceString.length - decimalIndex - 1;
        // JPY pairs (e.g., 150.123), Gold (e.g. 2300.12) have 2 or 3 decimals. Pip is 0.01.
        // Standard FX pairs (e.g., 1.23456) have 4 or 5 decimals. Pip is 0.0001.
        pipValue = (numDecimals <= 3) ? 0.01 : 0.0001;
    }

    let priceDiff = trade.closePrice - trade.openPrice;
    if (trade.type.toLowerCase().includes('sell')) {
        priceDiff = trade.openPrice - trade.closePrice;
    }

    return priceDiff / pipValue;
};

const calculateDuration = (trade: Trade): string => {
    if (!trade.closeTime || !trade.openTime || !trade.closeTime.getTime() || !trade.openTime.getTime()) return '-';
    const diffMs = trade.closeTime.getTime() - trade.openTime.getTime();
    if (diffMs < 0) return '-';

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}h ${minutes}m`;
};

const FilteredTradesTable: React.FC<FilteredTradesTableProps> = ({ trades, currency }) => {
    const { t, language } = useLanguage();

    const COLUMN_DEFINITIONS = useMemo(() => [
        { key: 'ticket' as const, label: t('trades_list.col_id'), defaultVisible: false },
        { key: 'openTime' as const, label: t('trades_list.col_open_time'), defaultVisible: false },
        { key: 'type' as const, label: t('dashboard.type'), defaultVisible: true },
        { key: 'size' as const, label: t('dashboard.size'), defaultVisible: true, isNumeric: true },
        { key: 'symbol' as const, label: t('dashboard.symbol'), defaultVisible: true },
        { key: 'openPrice' as const, label: t('trades_list.col_open_price'), defaultVisible: false, isNumeric: true },
        { key: 'closeTime' as const, label: t('trades_list.col_close_time'), defaultVisible: true },
        { key: 'duration' as const, label: t('trades_list.col_duration'), defaultVisible: true, isNumeric: false },
        { key: 'closePrice' as const, label: t('trades_list.col_close_price'), defaultVisible: false, isNumeric: true },
        { key: 'commission' as const, label: t('trades_list.col_commission'), defaultVisible: false, isNumeric: true },
        { key: 'swap' as const, label: t('trades_list.col_swap'), defaultVisible: false, isNumeric: true },
        { key: 'profit' as const, label: t('trades_list.col_profit'), defaultVisible: true, isNumeric: true },
        { key: 'profitPercentage' as const, label: t('trades_list.col_profit_percentage'), defaultVisible: true, isNumeric: true },
        { key: 'pips' as const, label: t('trades_list.col_pips'), defaultVisible: false, isNumeric: true },
        { key: 'comment' as const, label: t('trades_list.col_comment'), defaultVisible: false },
    ], [t]);

    const initialVisibility = useMemo(() => COLUMN_DEFINITIONS.reduce((acc, col) => {
        acc[col.key] = col.defaultVisible;
        return acc;
    }, {} as Record<typeof COLUMN_DEFINITIONS[number]['key'], boolean>), [COLUMN_DEFINITIONS]);

    const { data: visibleColumns, setData: setVisibleColumns } = useDBStorage('filtered_trades_columns_v4', initialVisibility);
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const handleColumnToggle = (key: typeof COLUMN_DEFINITIONS[number]['key']) => {
        setVisibleColumns(prev => ({...prev, [key]: !prev[key]}));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setDropdownOpen(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeColumns = COLUMN_DEFINITIONS.filter(col => visibleColumns?.[col.key]);

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
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">{t('analysis.filtered_trades_title')} ({trades.length})</h3>
                <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20 p-2 animate-fade-in-fast">
                            <p className="text-sm font-bold px-2 py-1">{t('trades_list.customize_columns')}</p>
                            {COLUMN_DEFINITIONS.map(col => (
                                <label key={col.key} className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded-md cursor-pointer">
                                    <input type="checkbox" checked={visibleColumns?.[col.key]} onChange={() => handleColumnToggle(col.key)} className="form-checkbox h-4 w-4 bg-gray-900 border-gray-600 rounded text-cyan-500 focus:ring-cyan-600"/>
                                    <span className="text-gray-300">{col.label}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase border-b border-gray-700 sticky top-0 bg-[#16152c]">
                        <tr>
                            {activeColumns.map(col => (
                                <th key={col.key} scope="col" className={`px-2 py-3 whitespace-nowrap ${col.isNumeric ? 'text-right' : ''}`}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {trades.map((trade) => (
                             <tr key={trade.ticket} className="text-xs hover:bg-gray-800/50">
                                {activeColumns.map(col => {
                                    const isBuy = trade.type.toLowerCase() === 'buy';
                                    let cellClass = 'text-white';
                                    let cellContent;

                                    switch(col.key) {
                                        case 'pips':
                                            const pips = calculatePips(trade);
                                            cellClass = pips >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold';
                                            cellContent = pips.toFixed(1);
                                            break;
                                        case 'duration':
                                            cellContent = calculateDuration(trade);
                                            break;
                                        case 'profitPercentage':
                                            const percentage = trade.profitPercentage ?? 0;
                                            cellClass = percentage >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold';
                                            cellContent = `${percentage.toFixed(2)}%`;
                                            break;
                                        case 'profit':
                                        case 'commission':
                                        case 'swap':
                                            cellClass = trade[col.key] >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold';
                                            cellContent = formatCurrency(trade[col.key]);
                                            break;
                                        case 'openTime':
                                        case 'closeTime':
                                            cellContent = renderDate(trade[col.key]);
                                            break;
                                        case 'type':
                                            cellClass = `font-bold uppercase ${isBuy ? 'text-cyan-400' : 'text-orange-400'}`;
                                            cellContent = trade.type;
                                            break;
                                        default:
                                            cellContent = trade[col.key as keyof Trade];
                                    }

                                    return (
                                        <td key={col.key} className={`px-2 py-3 ${cellClass} ${col.isNumeric ? 'text-right' : ''} ${col.key === 'comment' ? 'truncate max-w-[100px] sm:max-w-xs' : 'whitespace-nowrap'}`} title={col.key === 'comment' ? trade.comment : undefined}>
                                            {cellContent}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
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