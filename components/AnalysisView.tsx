

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label, Legend
} from 'recharts';
import { Trade, ChartDataPoint, Account, Strategy } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import MultiSelectDropdown from './MultiSelectDropdown';
import FilteredTradesTable from './FilteredTradesTable';
import useMediaQuery from '../hooks/useMediaQuery';
import { triggerHaptic } from '../utils/haptics';
import useDBStorage from '../hooks/useLocalStorage';

import CustomTooltip from './charts/CustomTooltip';
import MonthlyPerformanceChart from './analysis/MonthlyPerformanceChart';
import SymbolPieChart from './analysis/SymbolPieChart';
import BiasCard from './analysis/BiasCard';

interface AnalysisViewProps {
  trades: Trade[];
  initialBalance: Account['initialBalance'];
  onBackToDashboard: () => void;
  currency: 'USD' | 'EUR';
}

type TradeWithProfitPercentage = Trade & { profitPercentage: number };
type SplitMode = 'none' | 'symbol' | 'comment';

const SEGMENT_COLORS = [
    '#22d3ee', // Cyan
    '#f472b6', // Pink
    '#34d399', // Emerald
    '#a78bfa', // Violet
    '#fb923c', // Orange
    '#fbbf24', // Amber
    '#60a5fa', // Blue
    '#e879f9', // Fuchsia
    '#a3e635', // Lime
    '#f87171', // Red
];

const SplitTooltip = ({ active, payload, currency, language }: any) => {
    if (active && payload && payload.length) {
        const dateStr = new Date(payload[0].payload.timestamp).toLocaleDateString(language, {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        
        // Sort payload: Total first, then others by value desc
        const sortedPayload = [...payload].sort((a: any, b: any) => {
            if (a.name === 'Total Balance') return -1;
            if (b.name === 'Total Balance') return 1;
            return b.value - a.value;
        });

        const formatMoney = (val: number) => new Intl.NumberFormat(language, { 
            style: 'currency', 
            currency, 
            maximumFractionDigits: 0 
        }).format(val);

        return (
            <div className="bg-[#16152c]/95 backdrop-blur-sm border border-gray-700 p-4 rounded-2xl shadow-2xl text-xs sm:text-sm z-50">
                <p className="text-gray-400 mb-3 font-medium border-b border-gray-700/50 pb-2">{dateStr}</p>
                <div className="space-y-1.5">
                    {sortedPayload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                <span className={`font-medium ${entry.name === 'Total Balance' ? 'text-white' : 'text-gray-300'}`}>
                                    {entry.name}
                                </span>
                            </div>
                            <span className="font-bold text-white tabular-nums">
                                {formatMoney(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ trades, initialBalance, onBackToDashboard, currency }) => {
  const { t, language } = useLanguage();
  const { data: strategies } = useDBStorage<Strategy[]>('user_strategies_v1', []);

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [selectedStrategyNames, setSelectedStrategyNames] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('none');
  
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const chartRef = useRef<HTMLDivElement>(null);
  const lastActiveIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
                // Fix: Use setTimeout to avoid Recharts "width(-1)" warning
                setTimeout(() => {
                    setIsMounted(true);
                }, 0);
                resizeObserver.disconnect();
            }
        }
    });

    resizeObserver.observe(chartRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate static metadata (min/max dates)
  const { minDate, maxDate } = useMemo(() => {
    if (trades.length === 0) return { minDate: '', maxDate: '' };
    let minTimestamp = trades[0].closeTime.getTime();
    let maxTimestamp = trades[0].closeTime.getTime();

    trades.forEach(trade => {
      if (trade.closeTime.getTime() < minTimestamp) minTimestamp = trade.closeTime.getTime();
      if (trade.closeTime.getTime() > maxTimestamp) maxTimestamp = trade.closeTime.getTime();
    });
    
    const toISODateString = (date: Date) => date.toISOString().split('T')[0];

    return {
        minDate: toISODateString(new Date(minTimestamp)),
        maxDate: toISODateString(new Date(maxTimestamp))
    }
  }, [trades]);

  // Available Symbols (sorted)
  const availableSymbols = useMemo(() => {
    const symbolSet = new Set<string>();
    trades.forEach(trade => symbolSet.add(trade.symbol));
    return Array.from(symbolSet).sort();
  }, [trades]);

  // Available Strategies (sorted by name)
  const availableStrategyNames = useMemo(() => {
      return strategies.map(s => s.name).sort();
  }, [strategies]);

  // Ensure selected symbols are valid
  useEffect(() => {
      const validSymbols = new Set(availableSymbols);
      setSelectedSymbols(prev => {
          const next = prev.filter(s => validSymbols.has(s));
          return next.length === prev.length ? prev : next;
      });
  }, [availableSymbols]);

  // Ensure selected strategies are valid
  useEffect(() => {
      const validStrategyNames = new Set(availableStrategyNames);
      setSelectedStrategyNames(prev => {
          const next = prev.filter(s => validStrategyNames.has(s));
          return next.length === prev.length ? prev : next;
      });
  }, [availableStrategyNames]);

  useEffect(() => {
    setStartDate(minDate);
    setEndDate(maxDate);
  }, [minDate, maxDate]);
  
  // Mobile touch handling for tooltips
  useEffect(() => {
    const node = chartRef.current;
    if (node && isMobile) {
        const hideTooltip = () => {
            const mouseLeaveEvent = new MouseEvent('mouseleave', {
                view: window,
                bubbles: true,
                cancelable: true,
            });
            const surface = node.querySelector('.recharts-surface');
            if (surface) {
                surface.dispatchEvent(mouseLeaveEvent);
            }
        };

        node.addEventListener('touchend', hideTooltip);
        node.addEventListener('touchcancel', hideTooltip);
        
        return () => {
            node.removeEventListener('touchend', hideTooltip);
            node.removeEventListener('touchcancel', hideTooltip);
        };
    }
  }, [isMobile]);

  const handleChartMouseMove = (state: any) => {
    if (isMobile && state && state.isTooltipActive) {
        const currentIndex = state.activeLabel;
        
        if (currentIndex !== null && lastActiveIndex.current !== currentIndex) {
            triggerHaptic('light');
            lastActiveIndex.current = currentIndex;
        }
    } else if (!state || !state.isTooltipActive) {
        lastActiveIndex.current = null;
    }
  };

  const tradesWithProfitPercentage: TradeWithProfitPercentage[] = useMemo(() => {
    let runningBalance = initialBalance;
    return trades.map(trade => {
        const balanceBefore = runningBalance;
        const netProfit = trade.profit + trade.commission + trade.swap;
        runningBalance += netProfit;
        const profitPercentage = balanceBefore !== 0 ? (netProfit / balanceBefore) * 100 : 0;
        return { ...trade, profitPercentage };
    });
  }, [trades, initialBalance]);

  const filteredTrades = useMemo(() => {
    let result = tradesWithProfitPercentage;
    
    // Filter by Symbol
    if (selectedSymbols.length > 0) {
      result = result.filter(trade => selectedSymbols.includes(trade.symbol));
    }
    
    // Filter by Strategy
    if (selectedStrategyNames.length > 0) {
        const activeStrategies = strategies.filter(s => selectedStrategyNames.includes(s.name));
        result = result.filter(trade => {
            // Include trade if it matches criteria of ANY selected strategy
            return activeStrategies.some(s => {
                // Currently only 'comment' criteria is implemented
                if (s.criteria.comment) {
                    return trade.comment === s.criteria.comment;
                }
                return false; 
            });
        });
    }

    if (startDate) {
        const start = new Date(startDate).getTime();
        result = result.filter(trade => trade.closeTime.getTime() >= start);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        result = result.filter(trade => trade.closeTime.getTime() <= end.getTime());
    }
    return result;
  }, [tradesWithProfitPercentage, selectedSymbols, selectedStrategyNames, strategies, startDate, endDate]);

  // --- DATA PREPARATION FOR CHARTS ---

  // 1. Equity Curve Data (Standard & Split)
  const { chartData, filteredNetProfit, splitKeys } = useMemo(() => {
    if (filteredTrades.length === 0) return { chartData: [], filteredNetProfit: 0, splitKeys: [] };
    
    // Sort chronologically for chart
    const chronTrades = [...filteredTrades].sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());

    let runningBalance = initialBalance;
    let netProfit = 0;
    
    // For Split Mode: Identify all keys first
    const distinctKeys = new Set<string>();
    if (splitMode !== 'none') {
        chronTrades.forEach(t => {
            const key = splitMode === 'symbol' ? t.symbol : (t.comment || 'No Comment');
            distinctKeys.add(key);
        });
    }
    const sortedKeys = Array.from(distinctKeys).sort();

    // Initialize all segments at InitialBalance so they can be compared with Total Equity on the same scale
    const currentSegmentBalances: Record<string, number> = {};
    sortedKeys.forEach(k => currentSegmentBalances[k] = initialBalance);

    const data: any[] = [{
        date: '',
        balance: initialBalance,
        trade: null,
        index: 0,
        timestamp: chronTrades.length > 0 ? chronTrades[0].closeTime.getTime() - 1000 : 0,
        ...currentSegmentBalances
    }];
    
    chronTrades.forEach((trade, index) => {
        const tradeProfit = trade.profit + trade.commission + trade.swap;
        runningBalance += tradeProfit;
        netProfit += tradeProfit;

        if (splitMode !== 'none') {
            const currentKey = splitMode === 'symbol' ? trade.symbol : (trade.comment || 'No Comment');
            // Update the specific segment's running balance
            if (currentSegmentBalances[currentKey] !== undefined) {
                currentSegmentBalances[currentKey] += tradeProfit;
            }
        }

        const point: any = {
            date: trade.closeTime.toISOString(),
            balance: runningBalance,
            trade,
            index: index + 1,
            timestamp: trade.closeTime.getTime(),
            ...currentSegmentBalances // Spread current state of all segments
        };

        data.push(point);
    });

    return { 
        chartData: data, 
        filteredNetProfit: netProfit,
        splitKeys: sortedKeys
    };
  }, [filteredTrades, initialBalance, splitMode]);

  // 2. Monthly Performance Data
  const monthlyData = useMemo(() => {
      const map = new Map<string, number>();
      filteredTrades.forEach(t => {
          const key = `${t.closeTime.getFullYear()}-${String(t.closeTime.getMonth() + 1).padStart(2, '0')}`;
          const net = t.profit + t.commission + t.swap;
          map.set(key, (map.get(key) || 0) + net);
      });
      
      return Array.from(map.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([key, value]) => {
              const [y, m] = key.split('-');
              const date = new Date(parseInt(y), parseInt(m) - 1, 1);
              return {
                  month: date.toLocaleDateString(language, { month: 'short', year: '2-digit' }),
                  profit: value
              };
          });
  }, [filteredTrades, language]);

  // 3. Symbol Distribution Data (Pie)
  const symbolData = useMemo(() => {
      const map = new Map<string, number>();
      filteredTrades.forEach(t => {
          map.set(t.symbol, (map.get(t.symbol) || 0) + 1); // Counting volume
      });
      
      const sorted = Array.from(map.entries())
          .sort((a, b) => b[1] - a[1]);
      
      if (sorted.length <= 5) {
          return sorted.map(([name, value]) => ({ name, value }));
      }
      
      const top5 = sorted.slice(0, 5).map(([name, value]) => ({ name, value }));
      const others = sorted.slice(5).reduce((sum, [, val]) => sum + val, 0);
      
      return [...top5, { name: t('common.others') || 'Others', value: others }];
  }, [filteredTrades, t]);

  // 4. Buy/Sell Stats
  const biasStats = useMemo(() => {
      let buys = 0;
      let sells = 0;
      filteredTrades.forEach(t => {
          const type = t.type.toLowerCase();
          if (type.includes('buy')) buys++;
          else if (type.includes('sell')) sells++;
      });
      
      const total = buys + sells;
      const buyPct = total > 0 ? (buys / total) * 100 : 0;
      const sellPct = total > 0 ? (sells / total) * 100 : 0;
      
      let biasLabel = "Neutral";
      if (buyPct >= 65) biasLabel = "Strongly Bull";
      else if (buyPct > 55) biasLabel = "Bullish";
      else if (sellPct >= 65) biasLabel = "Strongly Bear";
      else if (sellPct > 55) biasLabel = "Bearish";
      
      return { buys, sells, total, buyPct, sellPct, biasLabel };
  }, [filteredTrades]);
  
  const xDomain = useMemo(() => {
      if (!chartData || chartData.length < 2) return [0, 1];
      const indices = chartData.map(d => d.index);
      const min = Math.min(...indices);
      const max = Math.max(...indices);
      return [min, max === min ? max + 1 : max];
  }, [chartData]);

  const yDomain = useMemo(() => {
    if (!chartData || chartData.length < 2) {
        return ['auto', 'auto'];
    }
    // Check all visible keys to determine domain
    const keysToCheck = splitMode === 'none' ? ['balance'] : ['balance', ...splitKeys];
    
    let min = Infinity;
    let max = -Infinity;

    chartData.forEach(d => {
        keysToCheck.forEach(k => {
            const val = d[k];
            if (typeof val === 'number') {
                if (val < min) min = val;
                if (val > max) max = val;
            }
        });
    });

    if (min === Infinity || max === -Infinity) return ['auto', 'auto'];

    if (min === max) {
        const padding = Math.abs(min * 0.01) || 10;
        return [min - padding, max + padding];
    }

    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [chartData, splitMode, splitKeys]);

  const yAxisTickFormatter = (value: any) => {
    const num = Number(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat(language, { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }).format(num);
  };
  
  const formatCurrency = (value: number) => {
      return new Intl.NumberFormat(language, { style: 'currency', currency, currencyDisplay: 'symbol' }).format(value);
  }

  const netProfitColor = filteredNetProfit >= 0 ? 'text-green-400' : 'text-red-400';
  const strokeColor = '#f87171'; // Default red for single line
  const profitFillColor = 'rgb(13 148 136)';
  const lossFillColor = 'rgb(159 18 57)';
  const grayColor = '#6b7280';

  const isBullDominant = biasStats.buyPct >= biasStats.sellPct;
  const isBearDominant = biasStats.sellPct > biasStats.buyPct;

  const stripeStyle = {
      backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.05) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.05) 50%,rgba(255,255,255,.05) 75%,transparent 75%,transparent)',
      backgroundSize: '1rem 1rem'
  };

  const handleSplitModeChange = (mode: SplitMode) => {
      setSplitMode(mode);
      triggerHaptic('light');
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">{t('analysis.title')}</h2>
            <button onClick={onBackToDashboard} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-2xl shadow-md transition-all">
                &larr; {t('analysis.back_to_dashboard')}
            </button>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-[#16152c] rounded-3xl border border-gray-700/50">
            <MultiSelectDropdown 
                options={availableSymbols}
                selectedOptions={selectedSymbols}
                onChange={setSelectedSymbols}
                placeholder={t('analysis.filter_symbols_placeholder')}
                title={t('analysis.filter_symbols_title')}
                itemNamePlural={t('analysis.item_name_symbols')}
            />
            {/* Replaced Comment Filter with Strategy Filter */}
            <MultiSelectDropdown 
                options={availableStrategyNames}
                selectedOptions={selectedStrategyNames}
                onChange={setSelectedStrategyNames}
                placeholder={t('analysis.filter_strategies_placeholder')}
                title={t('analysis.filter_strategies_title')}
                itemNamePlural={t('analysis.item_name_strategies')}
                emptyMessage={t('analysis.no_strategies_found')}
            />
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('analysis.start_date')}</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={minDate} max={endDate} className="w-full px-4 py-2 bg-gray-700 text-white rounded-2xl"/>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('analysis.end_date')}</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} max={maxDate} className="w-full px-4 py-2 bg-gray-700 text-white rounded-2xl"/>
            </div>
        </div>

        {/* 1. Equity Chart */}
        <div className="bg-[#16152c] p-4 sm:p-6 rounded-3xl shadow-lg border border-gray-700/50">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-lg font-semibold text-white">{t('dashboard.balance_chart_title')}</h3>
                
                {/* Advanced Measurement / Split Control */}
                <div className="flex items-center gap-2 bg-gray-800/50 p-1.5 rounded-2xl border border-gray-700/50">
                    <span className="text-xs text-gray-400 px-2 font-bold uppercase tracking-wider hidden sm:inline">Advanced Measurement</span>
                    <div className="flex bg-gray-700 rounded-xl p-1 relative">
                        {/* Animated slider background */}
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] bg-cyan-600 rounded-lg transition-all duration-300 ease-out shadow-sm
                            ${splitMode === 'none' ? 'left-1' : splitMode === 'symbol' ? 'left-[calc(33.33%+2px)]' : 'left-[calc(66.66%+2px)]'}`}
                        />
                        
                        <button onClick={() => handleSplitModeChange('none')} className={`relative z-10 w-20 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex justify-center ${splitMode === 'none' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                            None
                        </button>
                        <button onClick={() => handleSplitModeChange('symbol')} className={`relative z-10 w-20 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex justify-center ${splitMode === 'symbol' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                            Symbol
                        </button>
                        <button onClick={() => handleSplitModeChange('comment')} className={`relative z-10 w-20 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex justify-center ${splitMode === 'comment' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                            Comment
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ width: '100%', height: isMobile ? 300 : 450 }} ref={chartRef}>
                {chartData.length > 1 ? (
                    isMounted ? (
                        // CRITICAL FIX: minWidth={0} and minHeight={0} are required to prevent Recharts "width(-1)" warning
                        // during initial render or layout shifts. Do not remove.
                        <ResponsiveContainer width="100%" height={isMobile ? 300 : 450} minWidth={0} minHeight={0}>
                            {splitMode === 'none' ? (
                                <AreaChart 
                                    data={chartData} 
                                    margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? 0 : 0, bottom: 5 }}
                                    onMouseMove={handleChartMouseMove}
                                    onMouseLeave={() => (lastActiveIndex.current = null)}
                                >
                                    <defs>
                                        <linearGradient id="profitFillAnalysis" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={profitFillColor} stopOpacity={0.7}/><stop offset="95%" stopColor={profitFillColor} stopOpacity={0.4}/></linearGradient>
                                        <linearGradient id="lossFillAnalysis" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={lossFillColor} stopOpacity={0.4}/><stop offset="95%" stopColor={lossFillColor} stopOpacity={0.7}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                    <XAxis dataKey="index" stroke="#888" tick={{ fontSize: 12 }} allowDecimals={false} type="number" domain={xDomain} />
                                    <YAxis 
                                        stroke="#888" 
                                        tick={{ fontSize: 12 }} 
                                        tickFormatter={yAxisTickFormatter} 
                                        type="number" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        width={isMobile ? 40 : 60} 
                                        domain={yDomain} 
                                    />
                                    <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '3 3' }}/>
                                    <Area isAnimationActive={false} type="monotone" dataKey={(d) => d.balance >= initialBalance ? d.balance : initialBalance} baseValue={initialBalance} stroke="none" fill="url(#profitFillAnalysis)" />
                                    <Area isAnimationActive={false} type="monotone" dataKey={(d) => d.balance < initialBalance ? d.balance : initialBalance} baseValue={initialBalance} stroke="none" fill="url(#lossFillAnalysis)" />
                                    <Area isAnimationActive={false} type="monotone" dataKey="balance" stroke={strokeColor} strokeWidth={2} fill="none" />
                                    <ReferenceLine y={initialBalance} stroke={grayColor} strokeDasharray="3 3" strokeWidth={1.5}>
                                        <Label value="Initial" position="insideRight" fill={grayColor} fontSize={12} dy={-8} />
                                    </ReferenceLine>
                                </AreaChart>
                            ) : (
                                <LineChart
                                    data={chartData}
                                    margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? 0 : 0, bottom: 5 }}
                                    onMouseMove={handleChartMouseMove}
                                    onMouseLeave={() => (lastActiveIndex.current = null)}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                    <XAxis dataKey="index" stroke="#888" tick={{ fontSize: 12 }} allowDecimals={false} type="number" domain={xDomain} />
                                    <YAxis 
                                        stroke="#888" 
                                        tick={{ fontSize: 12 }} 
                                        tickFormatter={yAxisTickFormatter} 
                                        type="number" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        width={isMobile ? 40 : 60} 
                                        domain={yDomain} 
                                    />
                                    <Tooltip content={<SplitTooltip currency={currency} language={language} />} cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '3 3' }}/>
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '10px' }} />
                                    
                                    {/* Total Balance Curve (Thicker, White) */}
                                    <Line 
                                        type="monotone" 
                                        dataKey="balance" 
                                        name="Total Balance" 
                                        stroke="#ffffff" 
                                        strokeWidth={3} 
                                        dot={false} 
                                        activeDot={{ r: 6 }} 
                                    />

                                    {/* Split Curves */}
                                    {splitKeys.map((key, index) => (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            name={key}
                                            stroke={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                        />
                                    ))}
                                    
                                    {/* In Split mode, all curves start at Initial Balance, so the ref line is still valid */}
                                    <ReferenceLine y={initialBalance} stroke={grayColor} strokeDasharray="3 3" strokeWidth={1.5} />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    ) : null // Hide until mounted to prevent width(-1) error
                 ) : (
                  <div className="flex flex-col justify-center items-center h-full text-center">
                    <p className="text-gray-400">{t('dashboard.chart_no_data')}</p>
                  </div>
                )}
            </div>
            <div className="text-center mt-4 border-t border-gray-700 pt-4">
                <h4 className="text-lg font-semibold text-white">{t('analysis.filtered_profit_title')}</h4>
                <p className={`text-3xl font-bold ${netProfitColor}`}>{formatCurrency(filteredNetProfit)}</p>
            </div>
        </div>
        
        {/* 2. Additional Analysis Charts (Bar & Bias Card) */}
        {filteredTrades.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonthlyPerformanceChart 
                data={monthlyData}
                currency={currency}
                yAxisTickFormatter={yAxisTickFormatter}
                title={t('analysis.monthly_performance')}
                isMounted={isMounted}
            />

            <SymbolPieChart 
                data={symbolData}
                currency={currency}
                title={t('analysis.trade_volume_by_symbol')}
                isMounted={isMounted}
            />

            <BiasCard 
                biasStats={biasStats}
                isBearDominant={isBearDominant}
                isBullDominant={isBullDominant}
                stripeStyle={stripeStyle}
            />
        </div>
        )}

        {/* Filtered Trades Table */}
        <FilteredTradesTable trades={filteredTrades} currency={currency} />
    </div>
  );
};

export default AnalysisView;
