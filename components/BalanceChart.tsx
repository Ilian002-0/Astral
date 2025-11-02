import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { ChartDataPoint, Goals } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import useMediaQuery from '../hooks/useMediaQuery';
import { triggerHaptic } from '../utils/haptics';

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
    const { trade, balance, timestamp, isEquityPoint, floatingPnl } = dataPoint;
    
    if (isEquityPoint) {
       return (
        <div className="bg-[#16152c]/90 backdrop-blur-sm border border-gray-700 p-3 rounded-lg shadow-xl text-sm">
          <p className="font-bold text-lg text-white mb-1">Current Equity</p>
          <p className="text-gray-400 text-base font-semibold">{formatCurrency(balance)}</p>
          {floatingPnl !== undefined && (
              <div className="mt-2 border-t border-gray-600 pt-2 text-xs space-y-1">
                  <div className="flex justify-between items-center gap-4">
                      <span className="text-gray-400">Floating P/L</span>
                      <span className={`font-semibold ${floatingPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(floatingPnl, { signDisplay: 'always' })}
                      </span>
                  </div>
              </div>
          )}
        </div>
      );
    }

    if (trade) {
      if (trade.type === 'balance') {
        return (
          <div className="bg-[#16152c]/90 backdrop-blur-sm border border-gray-700 p-3 rounded-lg shadow-xl text-sm">
            <p className="font-bold text-lg text-white mb-1">{trade.profit > 0 ? 'Deposit' : 'Withdrawal'}</p>
            <p className="text-gray-400 text-base font-semibold">{formatCurrency(trade.profit, { signDisplay: 'always' })}</p>
            <p className="text-xs text-gray-500 mt-1">New Balance: {formatCurrency(balance)}</p>
          </div>
        );
      }
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
    
    // Fallback for initial balance point
    return (
      <div className="bg-[#16152c]/90 backdrop-blur-sm border border-gray-700 p-3 rounded-lg shadow-xl text-sm">
          <p className="font-bold text-lg text-white mb-1">Initial Balance</p>
          <p className="text-gray-400">{formatCurrency(balance)}</p>
      </div>
    );
  }
  return null;
};

type TimeRange = 'today' | 'week' | 'month' | 'all';

interface BalanceChartProps {
  data: ChartDataPoint[];
  onAdvancedAnalysisClick: () => void;
  initialBalance: number;
  currency: 'USD' | 'EUR';
  goals: Goals;
}


const BalanceChart: React.FC<BalanceChartProps> = ({ data, onAdvancedAnalysisClick, initialBalance, currency, goals }) => {
  const { t, language } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const chartRef = useRef<HTMLDivElement>(null);
  const lastActiveIndex = useRef<number | null>(null);

  const profitGoal = goals?.netProfit;
  const drawdownGoal = goals?.maxDrawdown;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        // Attach listeners directly to the chart container for better reliability on mobile.
        node.addEventListener('touchend', hideTooltip);
        node.addEventListener('touchcancel', hideTooltip);
        
        return () => {
            // The `node` variable is captured in the closure, so it's available here.
            node.removeEventListener('touchend', hideTooltip);
            node.removeEventListener('touchcancel', hideTooltip);
        };
    }
  }, [isMobile]);

  const yAxisTickFormatter = (value: any) => {
    const num = Number(value);
    if (isNaN(num)) return value;
    if (num === 0) return '0';
    
    return new Intl.NumberFormat(language, {
        notation: 'compact',
        compactDisplay: 'short'
    }).format(num);
  };
  
    const handleChartMouseMove = (state: any) => {
        if (isMobile && state && state.isTooltipActive) {
            // state.activeLabel corresponds to the value of the XAxis dataKey, which is 'index'
            const currentIndex = state.activeLabel;
            
            if (currentIndex !== null && lastActiveIndex.current !== currentIndex) {
                triggerHaptic('light');
                lastActiveIndex.current = currentIndex;
            }
        } else if (!state || !state.isTooltipActive) {
            // Reset when the finger leaves the chart area
            lastActiveIndex.current = null;
        }
    };

  const timeRangeOptions: { key: TimeRange; label: string; }[] = useMemo(() => [
    { key: 'today', label: t('dashboard.time_range.today') },
    { key: 'week', label: t('dashboard.time_range.week') },
    { key: 'month', label: t('dashboard.time_range.month') },
    { key: 'all', label: t('dashboard.time_range.all') },
  ], [t]);

  const filteredData = useMemo(() => {
    if (!data || data.length < 1) return []; // Should have at least the initial point

    if (timeRange === 'all') {
      return data; // The original data is already complete
    }

    const historicalData = data;
    const now = new Date();
    let timeFilteredData: ChartDataPoint[] = [];
    let startTime: number;

    switch (timeRange) {
      case 'today':
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        break;
      case 'week':
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        startTime = sevenDaysAgo.getTime();
        break;
      case 'month':
      default:
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        startTime = thirtyDaysAgo.getTime();
        break;
    }
    
    timeFilteredData = historicalData.filter(d => d.timestamp >= startTime);

    // Find the last data point just before the selected time range starts to anchor the chart
    const lastPointBeforeRange = historicalData
      .slice()
      .reverse()
      .find(d => d.timestamp < startTime);

    // If the filtered data includes the very first point of all time, we don't need to add anything.
    // The first point in historicalData is always the initial balance point with index 0.
    if (timeFilteredData.some(d => d.index === 0)) {
        return timeFilteredData;
    }

    // If we have a point before the range, prepend it.
    if (lastPointBeforeRange) {
      // If the filtered data starts right after our anchor, we don't need the anchor.
      if (timeFilteredData.length > 0 && timeFilteredData[0].index === lastPointBeforeRange.index + 1) {
          return [lastPointBeforeRange, ...timeFilteredData];
      }
      return [lastPointBeforeRange, ...timeFilteredData];
    }
    
    // If there's no data in range and no point before, it means all trades are in the future.
    // In this case, just show the initial balance point.
    if (timeFilteredData.length === 0 && !lastPointBeforeRange) {
        return [historicalData[0]];
    }

    return timeFilteredData;
  }, [data, timeRange]);

  const handleSelect = (range: TimeRange) => {
    setTimeRange(range);
    setDropdownOpen(false);
  };
  
  const currentLabel = timeRangeOptions.find(opt => opt.key === timeRange)?.label;
  const hasAnyData = filteredData.length > 1; // Need at least 2 points to draw a line/area

  const strokeColor = '#f87171'; // Static salmon/red color for the line
  const profitFillColor = 'rgb(13 148 136)'; // teal-600
  const lossFillColor = 'rgb(159 18 57)'; // rose-800
  const grayColor = '#6b7280'; // gray-500

  const chartDomain = useMemo(() => {
    if (!hasAnyData) return { domainMin: initialBalance * 0.95, domainMax: initialBalance * 1.05 };

    let balanceValues = filteredData.map(d => d.balance).filter(b => b !== null) as number[];
    if (balanceValues.length === 0) balanceValues = [initialBalance];

     if (profitGoal?.enabled && profitGoal.showOnChart && profitGoal.target) {
        balanceValues.push(initialBalance + profitGoal.target);
    }
    if (drawdownGoal?.enabled && drawdownGoal.showOnChart && drawdownGoal.target) {
        const drawdownValue = initialBalance - (initialBalance * (drawdownGoal.target / 100));
        balanceValues.push(drawdownValue);
    }
    
    const minBalance = Math.min(...balanceValues, initialBalance);
    const maxBalance = Math.max(...balanceValues, initialBalance);
    const range = maxBalance - minBalance;
    
    const padding = range === 0 ? (maxBalance > 0 ? maxBalance * 0.1 : 1000) : range * 0.05;

    const domainMin = Math.floor(minBalance - padding);
    const domainMax = Math.ceil(maxBalance + padding);
    return { domainMin, domainMax };
  }, [filteredData, hasAnyData, initialBalance, profitGoal, drawdownGoal]);

  const { domainMin, domainMax } = chartDomain;
  
  const xDomain = useMemo(() => {
      if (!hasAnyData) return [0, 1];
      const indices = filteredData.map(d => d.index);
      const min = Math.min(...indices);
      const max = Math.max(...indices);
      return [min, max === min ? max + 1 : max];
  }, [filteredData, hasAnyData]);

  return (
    <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h3 className="text-lg font-semibold text-white">{t('dashboard.balance_chart_title')}</h3>
        <div className="flex items-center gap-2">
             <button
                onClick={onAdvancedAnalysisClick}
                className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-sm text-cyan-300 rounded-lg shadow-sm transition-colors"
                >
                {t('dashboard.advanced_analysis')}
            </button>
            <div className="relative" ref={dropdownRef}>
                <button
                onClick={() => setDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between w-36 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-sm text-gray-300 rounded-lg shadow-sm transition-colors"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
                >
                <span className="truncate">{currentLabel}</span>
                <svg className={`w-4 h-4 ml-2 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                </button>
                {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-36 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 animate-fade-in-fast">
                        <ul className="py-1">
                            {timeRangeOptions.map(({ key, label }) => (
                                <li key={key}>
                                    <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleSelect(key); }}
                                    className={`block px-4 py-2 text-sm ${key === timeRange ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                    >
                                    {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
      </div>
      <div style={{ width: '100%', height: 300 }} ref={chartRef}>
        {hasAnyData ? (
          <ResponsiveContainer key={timeRange}>
            <AreaChart
              data={filteredData}
              onMouseMove={handleChartMouseMove}
              onMouseLeave={() => (lastActiveIndex.current = null)}
              margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : -30, bottom: 5 }}
            >
              <defs>
                 <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={profitFillColor} stopOpacity={0.7}/>
                    <stop offset="95%" stopColor={profitFillColor} stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={lossFillColor} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={lossFillColor} stopOpacity={0.7}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis 
                dataKey="index"
                stroke="#888" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                type="number"
                domain={xDomain}
                allowDecimals={false}
              />
              <YAxis 
                stroke="#888" 
                tick={{ fontSize: 12 }}
                tickFormatter={yAxisTickFormatter}
                domain={[domainMin, domainMax]}
                tickLine={false}
                axisLine={false}
                allowDataOverflow
              />
              <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '3 3' }}/>
              
              <Area
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                  type="monotone"
                  dataKey={(d) => (d.balance >= initialBalance ? d.balance : initialBalance)}
                  baseValue={initialBalance}
                  stroke="none"
                  fill="url(#profitFill)"
              />
              
              <Area
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                  type="monotone"
                  dataKey={(d) => (d.balance < initialBalance ? d.balance : initialBalance)}
                  baseValue={initialBalance}
                  stroke="none"
                  fill="url(#lossFill)"
              />
              
              <Area 
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
                type="monotone" 
                dataKey="balance" 
                stroke={strokeColor} 
                strokeWidth={2} 
                fill="none" 
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: strokeColor }} 
              />

              <ReferenceLine y={initialBalance} stroke={grayColor} strokeDasharray="3 3" strokeWidth={1.5}>
                <Label value="Initial" position="insideRight" fill={grayColor} fontSize={12} dy={-8} />
              </ReferenceLine>

              {profitGoal?.enabled && profitGoal.showOnChart && profitGoal.target && (
                  <ReferenceLine y={initialBalance + profitGoal.target} stroke="#22c55e" strokeDasharray="5 5" strokeWidth={2}>
                      <Label value={t('goals.profit_target_label')} position="insideRight" fill="#22c55e" fontSize={12} dy={-8} />
                  </ReferenceLine>
              )}
              {drawdownGoal?.enabled && drawdownGoal.showOnChart && drawdownGoal.target && (
                  <ReferenceLine y={initialBalance - (initialBalance * (drawdownGoal.target / 100))} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2}>
                      <Label value={t('goals.drawdown_target_label')} position="insideRight" fill="#ef4444" fontSize={12} dy={-8} />
                  </ReferenceLine>
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col justify-center items-center h-full text-center">
            <p className="text-gray-400">{t('dashboard.chart_no_data')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceChart;