
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
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

type TradeWithProfitPercentage = Trade & { profitPercentage: number };

const COLORS = ['#22d3ee', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#94a3b8']; // Cyan, Emerald, Pink, Violet, Orange, Gray
const BUY_COLOR = '#22d3ee'; // Cyan
const SELL_COLOR = '#fb923c'; // Orange

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
    // Handling different chart types in tooltip
    if (payload[0].payload.month) {
        // Monthly Bar Chart
        const { month, profit } = payload[0].payload;
        return (
             <div className="bg-[#16152c]/90 backdrop-blur-sm border border-gray-700 p-3 rounded-lg shadow-xl text-sm">
                <p className="font-bold text-white mb-1">{month}</p>
                <p className={`font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(profit, { signDisplay: 'always' })}
                </p>
            </div>
        );
    }
    
    if (payload[0].name && payload[0].value !== undefined && !payload[0].payload.date) {
        // Pie Chart
        const { name, value } = payload[0];
        return (
            <div className="bg-[#16152c]/90 backdrop-blur-sm border border-gray-700 p-2 rounded-lg shadow-xl text-xs">
                <span className="text-gray-300">{name}: </span>
                <span className="font-bold text-white">{value} trades</span>
            </div>
        );
    }

    // Area Chart (Equity)
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

  // Calculate available symbols dynamically based on selected comments
  const availableSymbols = useMemo(() => {
    const symbolSet = new Set<string>();
    
    const sourceTrades = selectedComments.length > 0 
        ? trades.filter(t => t.comment && selectedComments.includes(t.comment))
        : trades;

    sourceTrades.forEach(trade => {
        symbolSet.add(trade.symbol);
    });
    return Array.from(symbolSet).sort();
  }, [trades, selectedComments]);

  // Calculate available comments dynamically based on selected symbols
  const availableComments = useMemo(() => {
    const commentSet = new Set<string>();
    
    const sourceTrades = selectedSymbols.length > 0 
        ? trades.filter(t => selectedSymbols.includes(t.symbol))
        : trades;

    sourceTrades.forEach(trade => {
        if (trade.comment) commentSet.add(trade.comment);
    });
    
    return Array.from(commentSet).sort();
  }, [trades, selectedSymbols]);

  // Ensure selected items are valid according to available options
  useEffect(() => {
      const validSymbols = new Set(availableSymbols);
      setSelectedSymbols(prev => {
          const next = prev.filter(s => validSymbols.has(s));
          return next.length === prev.length ? prev : next;
      });
  }, [availableSymbols]);

  useEffect(() => {
      const validComments = new Set(availableComments);
      setSelectedComments(prev => {
          const next = prev.filter(c => validComments.has(c));
          return next.length === prev.length ? prev : next;
      });
  }, [availableComments]);

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
        end.setHours(23, 59, 59, 999);
        result = result.filter(trade => trade.closeTime.getTime() <= end.getTime());
    }
    return result;
  }, [tradesWithProfitPercentage, selectedSymbols, selectedComments, startDate, endDate]);

  // --- DATA PREPARATION FOR CHARTS ---

  // 1. Equity Curve Data
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
    const balances = chartData.map(d => d.balance);
    let min = Math.min(...balances);
    let max = Math.max(...balances);

    if (min === max) {
        const padding = Math.abs(min * 0.01) || 10;
        return [min - padding, max + padding];
    }

    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [chartData]);

  const yAxisTickFormatter = (value: any) => {
    const num = Number(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat(language, { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }).format(num);
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

  const isBullDominant = biasStats.buyPct >= biasStats.sellPct;
  const isBearDominant = biasStats.sellPct > biasStats.buyPct;

  // Stripe pattern for the "back" of the bars (unfilled area)
  // Applied to the container background
  const stripeStyle = {
      backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.05) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.05) 50%,rgba(255,255,255,.05) 75%,transparent 75%,transparent)',
      backgroundSize: '1rem 1rem'
  };

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
                options={availableSymbols}
                selectedOptions={selectedSymbols}
                onChange={setSelectedSymbols}
                placeholder={t('analysis.filter_symbols_placeholder')}
                title={t('analysis.filter_symbols_title')}
                itemNamePlural={t('analysis.item_name_symbols')}
            />
            <MultiSelectDropdown 
                options={availableComments}
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

        {/* 1. Equity Chart */}
        <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.balance_chart_title')}</h3>
            <div style={{ width: '100%', height: isMobile ? 300 : 400 }} ref={chartRef}>
                {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
        
        {/* 2. Additional Analysis Charts (Bar & Bias Card) */}
        {filteredTrades.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Performance Bar Chart */}
            <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50 lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">{t('analysis.monthly_performance')}</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
                            <XAxis dataKey="month" stroke="#888" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis stroke="#888" tick={{ fontSize: 12 }} tickFormatter={yAxisTickFormatter} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip currency={currency} />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                            {/* Updated radius to be fully rounded pills */}
                            <Bar dataKey="profit" radius={[4, 4, 4, 4]}>
                                {monthlyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#4ade80' : '#f87171'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Symbol Distribution Pie Chart */}
            <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">{t('analysis.trade_volume_by_symbol')}</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                            <Pie
                                data={symbolData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {symbolData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip currency={currency} />} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Behavioral Bias Card (Replaces Pie Chart) */}
            <div className="bg-[#16152c] p-6 rounded-2xl shadow-lg border border-gray-700/50 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                    <span className="text-gray-400 font-medium">Behavioral Bias</span>
                    <span className="text-white font-bold">Total Trades: {biasStats.total}</span>
                </div>

                <div className="relative flex justify-between items-center px-4 mb-4 h-32">
                    <img 
                        src="https://i.imgur.com/07RKkwK.png" 
                        alt="Bear"
                        className={`h-32 w-32 object-contain transition-all duration-500 z-10 ${
                            isBearDominant
                            ? 'opacity-100 scale-110 drop-shadow-[0_0_15px_rgba(251,146,60,0.5)]' 
                            : 'opacity-40 grayscale scale-100'
                        }`} 
                    />
                    
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <h2 className="text-3xl font-bold text-white text-center drop-shadow-lg z-0">{biasStats.biasLabel}</h2>
                    </div>

                    <img 
                        src="https://i.imgur.com/D83p1q4.png" 
                        alt="Bull" 
                        className={`h-32 w-32 object-contain transition-all duration-500 z-10 ${
                            isBullDominant
                            ? 'opacity-100 scale-110 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]' 
                            : 'opacity-40 grayscale scale-100'
                        }`} 
                    />
                </div>

                {/* Divergent Progress Bar (Center is 0%) */}
                <div className="relative w-full h-8 flex items-center mb-2">
                    {/* Middle Marker (0%) */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-500 z-20 -translate-x-1/2"></div>

                    {/* Left Side (Sell) */}
                    {/* Background is striped. Inner div is solid fill. */}
                    <div className="w-1/2 relative h-full bg-gray-800/30 rounded-l-full overflow-hidden flex justify-end" style={stripeStyle}>
                         <div 
                            className={`h-full transition-all duration-500 ${isBearDominant ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]' : 'bg-orange-600/70'} rounded-l-full`}
                            style={{ width: `${biasStats.sellPct}%` }}
                         />
                    </div>

                    {/* Right Side (Buy) */}
                    {/* Background is striped. Inner div is solid fill. */}
                    <div className="w-1/2 relative h-full bg-gray-800/30 rounded-r-full overflow-hidden flex justify-start" style={stripeStyle}>
                        <div 
                            className={`h-full transition-all duration-500 ${isBullDominant ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'bg-cyan-600/70'} rounded-r-full`}
                            style={{ width: `${biasStats.buyPct}%` }}
                        />
                    </div>
                </div>

                <div className="relative h-6 mt-1">
                    <div className={`absolute left-0 top-0 text-sm font-medium transition-colors ${isBearDominant ? 'text-orange-400 font-bold' : 'text-gray-400'}`}>
                        {biasStats.sells} ({biasStats.sellPct.toFixed(1)}%)
                    </div>
                    
                    {/* Absolute centered 0% label */}
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 text-xs text-gray-500">
                        0%
                    </div>

                    <div className={`absolute right-0 top-0 text-sm font-medium transition-colors ${isBullDominant ? 'text-cyan-400 font-bold' : 'text-gray-400'}`}>
                        {biasStats.buys} ({biasStats.buyPct.toFixed(1)}%)
                    </div>
                </div>
            </div>
        </div>
        )}

        {/* Filtered Trades Table */}
        <FilteredTradesTable trades={filteredTrades} currency={currency} />
    </div>
  );
};

export default AnalysisView;
