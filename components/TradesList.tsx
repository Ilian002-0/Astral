import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trade } from '../types';
import useDBStorage from '../hooks/useLocalStorage';
import { useLanguage } from '../contexts/LanguageContext';

interface TradesListProps {
  trades: Trade[];
  currency: 'USD' | 'EUR';
}

type TradeKeys = keyof Trade | 'duration';

const calculateDuration = (trade: Trade): string => {
    if (!trade.closeTime || !trade.openTime || !trade.closeTime.getTime() || !trade.openTime.getTime()) return '-';
    const diffMs = trade.closeTime.getTime() - trade.openTime.getTime();
    if (diffMs < 0) return '-';

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}h ${minutes}m`;
};

const TradesList: React.FC<TradesListProps> = ({ trades, currency }) => {
    const { t, language } = useLanguage();

    const COLUMN_DEFINITIONS: { key: TradeKeys; label: string; defaultVisible: boolean; }[] = useMemo(() => [
        { key: 'ticket', label: t('trades_list.col_id'), defaultVisible: true },
        { key: 'openTime', label: t('trades_list.col_open_time'), defaultVisible: false },
        { key: 'type', label: t('trades_list.col_type'), defaultVisible: true },
        { key: 'size', label: t('trades_list.col_size'), defaultVisible: true },
        { key: 'symbol', label: t('trades_list.col_symbol'), defaultVisible: true },
        { key: 'openPrice', label: t('trades_list.col_open_price'), defaultVisible: false },
        { key: 'closeTime', label: t('trades_list.col_close_time'), defaultVisible: true },
        { key: 'duration', label: t('trades_list.col_duration'), defaultVisible: true },
        { key: 'closePrice', label: t('trades_list.col_close_price'), defaultVisible: false },
        { key: 'commission', label: t('trades_list.col_commission'), defaultVisible: false },
        { key: 'swap', label: t('trades_list.col_swap'), defaultVisible: false },
        { key: 'profit', label: t('trades_list.col_profit'), defaultVisible: true },
        { key: 'comment', label: t('trades_list.col_comment'), defaultVisible: false },
    ], [t]);

    const initialVisibility = useMemo(() => COLUMN_DEFINITIONS.reduce((acc, col) => {
        acc[col.key] = col.defaultVisible;
        return acc;
    }, {} as Record<TradeKeys, boolean>), [COLUMN_DEFINITIONS]);

    const { data: visibleColumns, setData: setVisibleColumns, isLoading } = useDBStorage('trades_list_columns_v2', initialVisibility);
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const reversedTrades = useMemo(() => [...trades].reverse(), [trades]);

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
        return date.toLocaleString(language, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatValue = (trade: Trade, key: TradeKeys) => {
        if (key === 'duration') {
            return calculateDuration(trade);
        }
        const value = trade[key as keyof Trade];
        if (value instanceof Date) {
            return formatDate(value);
        }
        if (key === 'profit' || key === 'commission' || key === 'swap') {
            return formatCurrency(value as number);
        }
        return value;
    }

    const handleColumnToggle = (key: TradeKeys) => {
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

    const filteredTrades = useMemo(() => {
        if (!searchTerm) return reversedTrades;
        const lowercasedFilter = searchTerm.toLowerCase();
        return reversedTrades.filter(trade => {
            return Object.values(trade).some(val => 
                String(val).toLowerCase().includes(lowercasedFilter)
            );
        });
    }, [reversedTrades, searchTerm]);

    if (isLoading) {
        return <div className="text-center p-8">Loading...</div>;
    }

    const activeColumns = COLUMN_DEFINITIONS.filter(col => visibleColumns[col.key]);

    return (
        <div className="bg-[#16152c] rounded-2xl shadow-lg border border-gray-700/50">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <h2 className="text-xl font-bold text-white">{t('trades_list.title', { count: filteredTrades.length })}</h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder={t('trades_list.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-48 px-3 py-2 bg-[#0c0b1e] border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
                    />
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20 p-2">
                                <p className="text-sm font-bold px-2 py-1">{t('trades_list.customize_columns')}</p>
                                {COLUMN_DEFINITIONS.map(col => (
                                    <label key={col.key} className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded-md cursor-pointer">
                                        <input type="checkbox" checked={visibleColumns[col.key]} onChange={() => handleColumnToggle(col.key)} className="form-checkbox h-4 w-4 bg-gray-900 border-gray-600 rounded text-cyan-500 focus:ring-cyan-600"/>
                                        <span>{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase border-b-2 border-gray-700">
                        <tr>
                            {activeColumns.map(col => (
                                <th key={col.key} scope="col" className="px-2 sm:px-4 py-3 whitespace-nowrap">{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTrades.map((trade, index) => (
                            <tr 
                                key={trade.ticket} 
                                className="border-b border-gray-800 text-xs hover:bg-gray-800/50 animate-fade-in-up align-top"
                                style={{ animationDelay: `${index * 20}ms`, opacity: 0 }}
                            >
                               {activeColumns.map(col => {
                                    const isBuy = trade.type.toLowerCase() === 'buy';
                                    let cellClass = 'text-white';
                                    if(col.key === 'type') cellClass = `font-bold uppercase ${isBuy ? 'text-cyan-400' : 'text-orange-400'}`;
                                    if(col.key === 'profit' || col.key === 'commission' || col.key === 'swap') {
                                        const value = trade[col.key as keyof Trade];
                                        if (typeof value === 'number') {
                                            cellClass = `font-bold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`;
                                        }
                                    }
                                    
                                    const isComment = col.key === 'comment';
                                    const isDateColumn = col.key === 'openTime' || col.key === 'closeTime';
                                    
                                    if (isDateColumn) {
                                        const dateValue = trade[col.key] as Date;
                                        return (
                                            <td key={col.key} className="px-2 sm:px-4 py-3 text-white leading-tight">
                                                <div className="sm:hidden">
                                                    <div>{dateValue.toLocaleDateString(language, { month: 'short', day: 'numeric', year: '2-digit' })}</div>
                                                    <div className="text-gray-500">{dateValue.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                                                </div>
                                                <span className="hidden sm:inline whitespace-nowrap">{formatDate(dateValue)}</span>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td 
                                            key={col.key} 
                                            className={`px-2 sm:px-4 py-3 whitespace-nowrap ${cellClass} ${isComment ? 'max-w-xs truncate' : ''}`}
                                            title={isComment ? trade.comment : undefined}
                                        >
                                            {formatValue(trade, col.key)}
                                        </td>
                                    );
                               })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredTrades.length === 0 && (
                <div className="text-center py-10 px-4 sm:px-6 text-gray-500">
                    <p>{t('trades_list.no_trades_found')}</p>
                </div>
            )}
        </div>
    );
};

export default TradesList;