import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { Trade, ChartDataPoint, Account } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import MultiSelectDropdown from './MultiSelectDropdown';
import FilteredTradesTable from './FilteredTradesTable';
import useMediaQuery from '../hooks/useMediaQuery';
import { triggerHaptic } from '../utils/haptics';

interface AnalysisViewProps {
  trades: Trade[];
  initialBalance: Account['initialBalance'];
  onBackToDashboard: () => void;
  currency: 'USD' | 'EUR';
}

const CustomTooltip: React.FC<any> = ({ active, payload, currency }) => {
  const { language } = useLanguage();
  const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) => {
    const symbol = currency === 'USD' ? '$' : '€';
    
    let sign = '';
    const _options = options || {};
    if (_options.signDisplay === 'always') {
        sign = value >= 0 ? '+' : '-';
    } else if (value < 0) {
        sign = '-';
    }

    const numberPart = new Intl.NumberFormat(language, {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(value));

    if (language === 'fr') {
        return `${sign}${numberPart}${symbol}`;
    }
    return `${sign}${symbol}${numberPart}`;
  }

  if (active && payload && payload.length) {
    const dataPoint: ChartDataPoint = payload[0].payload;
    const { trade, balance, timestamp } = dataPoint;

    if (trade) {
      const netProfit = trade.profit + trade.commission + trade.swap;
      return (
        <div className="bg-[#16152c]/90 backdrop-blur-sm border border-gray-700 p-3 rounded-lg shadow-xl text-sm">
          <p className="font-bold text-lg text-white mb-1">{formatCurrency(balance)}</p>
          <p className="text-gray-400">{new Date(timestamp).toLocaleDateString(language, {month: 'short', day: 'numeric', year: 'numeric'})}</p>
          <div className="mt-2 border-t border-gray-600 pt-2 text-xs">
              <div className="flex justify-between items-center gap-4">
                  <span className="text-gray-400">{(trade.type + ' ' + trade.symbol).toLowerCase()}</span>
                  <span className={`font-semibold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(netProfit, { signDisplay: 'always' })}
                  </span>
              </div>
          </div>
        </div>
      );
    }
    return null;
  }
  return null;
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ trades, initialBalance, onBackToDashboard, currency }) => {
  const { t, language } = useLanguage();
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const chartRef = useRef<HTMLDivElement>(null);
  const lastActiveIndex = useRef<number | null>(null);

  const { allSymbols, allComments, minDate, maxDate } = useMemo(() => {
    if (trades.length === 0) return { allSymbols: [], allComments: [], minDate: '', maxDate: '' };
    const symbolSet = new Set<string>();
    const commentSet = new Set<string>();
    let minTimestamp = trades[0].closeTime.getTime();
    let maxTimestamp = trades[0].closeTime.getTime();

    trades.forEach(trade => {
      symbolSet.add(trade.symbol);
      if (trade.comment) commentSet.add(trade.comment);
      if (trade.closeTime.getTime() < minTimestamp) minTimestamp = trade.closeTime.getTime();
      if (trade.closeTime.getTime() > maxTimestamp) maxTimestamp = trade.closeTime.getTime();
    });
    
    const toISODateString = (date: Date) => date.toISOString().split('T')[0];

    return {
        allSymbols: Array.from(symbolSet).sort(),
        allComments: Array.from(commentSet).sort(),
        minDate: toISODateString(new Date(minTimestamp)),
        maxDate: toISODateString(new Date(maxTimestamp))
    }
  }, [trades]);

  useEffect(() => {
    setStartDate(minDate);
    setEndDate(maxDate);
  }, [minDate, maxDate]);
  
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

  const filteredTrades = useMemo(() => {
    let result = trades;
    if (selectedSymbols.length > 0) {
      result = result.filter(trade => selectedSymbols.includes(trade.symbol));
    }
    if (selectedComments.length > 0) {
      result = result.filter(trade => trade.comment && selectedComments.includes(trade.comment));
    }
    if (startDate) {
        const start = new Date(startDate).getTime();
        result = result.filter(trade => trade.closeTime.getTime() >= start);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the whole end day
        result = result.filter(trade => trade.closeTime.getTime() <= end.getTime());
    }
    return result;
  }, [trades, selectedSymbols, selectedComments, startDate, endDate]);

  const { chartData, filteredNetProfit } = useMemo(() => {
    if (filteredTrades.length === 0) return { chartData: [], filteredNetProfit: 0 };
    
    let runningBalance = initialBalance;
    let netProfit = 0;
    
    const data: ChartDataPoint[] = [{
        date: '',
        balance: initialBalance,
        trade: null,
        index: 0,
        timestamp: 0,
    }];
    
    filteredTrades.forEach((trade, index) => {
        const tradeProfit = trade.profit + trade.commission + trade.swap;
        runningBalance += tradeProfit;
        netProfit += tradeProfit;
        data.push({
            date: trade.closeTime.toISOString(),
            balance: runningBalance,
            trade,
            index: index + 1,
            timestamp: trade.closeTime.getTime(),
        });
    });

    return { chartData: data, filteredNetProfit: netProfit };
  }, [filteredTrades, initialBalance]);
  
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
    const balances = chartData.map(d => d.balance);
    let min = Math.min(...balances);
    let max = Math.max(...balances);

    if (min === max) {
        const padding = Math.abs(min * 0.01) || 10; // 1% padding or 10 units
        return [min - padding, max + padding];
    }

    const padding = (max - min) * 0.1;
    
    return [min - padding, max + padding];
  }, [chartData]);

  const yAxisTickFormatter = (value: any) => {
    const num = Number(value);
    if (isNaN(num)) return value;
    
    return new Intl.NumberFormat(language, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(num);
  };
  
  const formatCurrency = (value: number) => {
      const symbol = currency === 'USD' ? '$' : '€';
      return new Intl.NumberFormat(language, { style: 'currency', currency, currencyDisplay: 'symbol' }).format(value);
  }

  const netProfitColor = filteredNetProfit >= 0 ? 'text-green-400' : 'text-red-400';
  const strokeColor = '#f87171';
  const profitFillColor = 'rgb(13 148 136)';
  const lossFillColor = 'rgb(159 18 57)';
  const grayColor = '#6b7280';

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">{t('analysis.title')}</h2>
            <button onClick={onBackToDashboard} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg shadow-md transition-all">
                &larr; {t('analysis.back_to_dashboard')}
            </button>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-[#16152c] rounded-2xl border border-gray-700/50">
            <MultiSelectDropdown 
                options={allSymbols}
                selectedOptions={selectedSymbols}
                onChange={setSelectedSymbols}
                placeholder={t('analysis.filter_symbols_placeholder')}
                title={t('analysis.filter_symbols_title')}
                itemNamePlural={t('analysis.item_name_symbols')}
            />
            <MultiSelectDropdown 
                options={allComments}
                selectedOptions={selectedComments}
                onChange={setSelectedComments}
                placeholder={t('analysis.filter_comments_placeholder')}
                title={t('analysis.filter_comments_title')}
                itemNamePlural={t('analysis.item_name_comments')}
            />
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('analysis.start_date')}</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={minDate} max={endDate} className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"/>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('analysis.end_date')}</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} max={maxDate} className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"/>
            </div>
        </div>

        {/* Chart */}
        <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
            <div style={{ width: '100%', height: isMobile ? 300 : 400 }} ref={chartRef}>
                {chartData.length > 1 ? (
                <ResponsiveContainer>
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
                </ResponsiveContainer>
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

        {/* Filtered Trades Table */}
        <FilteredTradesTable trades={filteredTrades} currency={currency} />
    </div>
  );
};

export default AnalysisView;