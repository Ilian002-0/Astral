import React, { useState, useMemo, useRef, useEffect } from 'react';
// FIX: Import the `Label` component from recharts to be used with `ReferenceLine`.
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { ChartDataPoint } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import useMediaQuery from '../hooks/useMediaQuery';

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  const { language } = useLanguage();
  
  const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(language, { style: 'currency', currency: 'USD', ...options }).format(value);
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
      // Correctly add negative commission/swap values to find the net profit.
      const netProfit = trade.profit + trade.commission + trade.swap;

      return (
        <div className="bg-[#16152c]/90 backdrop-blur-sm border border-gray-700 p-3 rounded-lg shadow-xl text-sm">
          <p className="font-bold text-lg text-white mb-1">{formatCurrency(balance)}</p>
          <p className="text-gray-400">{new Date(timestamp).toLocaleDateString(language, {month: 'short', day: 'numeric', year: 'numeric'})}</p>
          
          <div className="mt-2 border-t border-gray-600 pt-2 text-xs space-y-1">
              <div className="flex justify-between items-center">
                  <span className="text-gray-400">Trade #{trade.ticket}</span>
                  <span className={`font-semibold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(netProfit, { signDisplay: 'always' })}
                  </span>
              </div>
              <div className="flex justify-between items-center">
                  <span className="text-gray-400">{trade.type.toUpperCase()} {trade.symbol}</span>
                  <span className="text-white">{trade.size} lots</span>
              </div>
          </div>
        </div>
      );
    }
  }
  return null;
};

type TimeRange = 'today' | 'week' | 'month' | 'all';

interface BalanceChartProps {
  data: ChartDataPoint[];
  onAdvancedAnalysisClick: () => void;
  initialBalance: number;
}


const BalanceChart: React.FC<BalanceChartProps> = ({ data, onAdvancedAnalysisClick, initialBalance }) => {
  const { t, language } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const yAxisTickFormatter = (value: number) => {
    const formattedValue = new Intl.NumberFormat(language, {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(value);
    return `$${formattedValue}`;
  };

  const timeRangeOptions: { key: TimeRange; label: string; }[] = useMemo(() => [
    { key: 'today', label: t('dashboard.time_range.today') },
    { key: 'week', label: t('dashboard.time_range.week') },
    { key: 'month', label: t('dashboard.time_range.month') },
    { key: 'all', label: t('dashboard.time_range.all') },
  ], [t]);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const historicalData = data;
    const now = new Date();
    let timeFilteredData: ChartDataPoint[] = [];

    switch (timeRange) {
        case 'today': {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            timeFilteredData = historicalData.filter(d => d.timestamp >= startOfToday.getTime());
            break;
        }
        case 'week': {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            timeFilteredData = historicalData.filter(d => d.timestamp >= sevenDaysAgo.getTime());
            break;
        }
        case 'month': {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            timeFilteredData = historicalData.filter(d => d.timestamp >= thirtyDaysAgo.getTime());
            break;
        }
        case 'all':
        default:
            timeFilteredData = historicalData;
    }
    
    const firstPointTime = timeFilteredData[0]?.timestamp;
    const lastPointBeforeRange = historicalData.slice().reverse().find(d => d.timestamp < firstPointTime);
    const startingBalance = lastPointBeforeRange ? lastPointBeforeRange.balance : initialBalance;
    const startingIndex = lastPointBeforeRange ? lastPointBeforeRange.index : 0;

    const startingPoint: ChartDataPoint = {
        date: new Date(firstPointTime ? firstPointTime - 1 : Date.now()).toISOString().split('T')[0],
        balance: startingBalance,
        trade: null,
        index: startingIndex,
        timestamp: firstPointTime ? firstPointTime - 1 : Date.now(),
    };
    
    return [startingPoint, ...timeFilteredData];
  }, [data, timeRange, initialBalance]);

  const handleSelect = (range: TimeRange) => {
    setTimeRange(range);
    setDropdownOpen(false);
  };
  
  const currentLabel = timeRangeOptions.find(opt => opt.key === timeRange)?.label;
  const hasEnoughCurveData = filteredData && filteredData.length >= 2;
  const hasAnyData = filteredData.length > 0;
  
  const endBalance = hasEnoughCurveData ? filteredData[filteredData.length - 1].balance : initialBalance;
  
  const strokeColor = endBalance >= initialBalance ? '#2dd4bf' : '#f87171';
  const belowInitialColor = '#ef4444';

  const chartDomain = useMemo(() => {
    if (!hasAnyData) return { domainMin: 0, domainMax: 0 };

    const balanceValues = filteredData.map(d => d.balance).filter(b => b !== null) as number[];
    if (balanceValues.length === 0) return { domainMin: initialBalance - 500, domainMax: initialBalance + 500 };

    const minBalance = Math.min(...balanceValues, initialBalance);
    const maxBalance = Math.max(...balanceValues, initialBalance);
    const range = maxBalance - minBalance;
    
    const padding = range === 0 ? (maxBalance > 0 ? maxBalance * 0.1 : 1000) : range * 0.05;

    const domainMin = Math.floor(minBalance - padding);
    const domainMax = Math.ceil(maxBalance + padding);
    return { domainMin, domainMax };
  }, [filteredData, hasAnyData, initialBalance]);

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
                className="flex items-center justify-between w-40 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-sm text-gray-300 rounded-lg shadow-sm transition-colors"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
                >
                <span className="truncate">{currentLabel}</span>
                <svg className={`w-4 h-4 ml-2 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                </button>
                {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 animate-fade-in-fast">
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
      <div style={{ width: '100%', height: 300 }}>
        {hasAnyData ? (
          <ResponsiveContainer>
            <AreaChart
              data={filteredData}
              margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? 5 : 40, bottom: 5 }}
            >
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={belowInitialColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={belowInitialColor} stopOpacity={0.05} />
                </linearGradient>
                <clipPath id="clipAbove">
                    <rect x="0" y="0" width="100%" height={initialBalance ? (1 - (initialBalance - domainMin) / (domainMax - domainMin)) * 100 + '%' : '100%'} />
                </clipPath>
                <clipPath id="clipBelow">
                    <rect x="0" y={initialBalance ? (1 - (initialBalance - domainMin) / (domainMax - domainMin)) * 100 + '%' : '0'} width="100%" height={initialBalance ? ((initialBalance - domainMin) / (domainMax - domainMin)) * 100 + '%' : '0'} />
                </clipPath>
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
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '3 3' }}/>
              <ReferenceLine y={initialBalance} stroke="#a0aec0" strokeDasharray="4 4" strokeWidth={1}>
                {/* FIX: Use the `Label` component from recharts, not the standard HTML `label` tag. */}
                <Label value="Initial" position="insideRight" fill="#a0aec0" fontSize={10} />
              </ReferenceLine>
              
              <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke={strokeColor}
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#balanceGradient)"
                  clipPath="url(#clipAbove)"
              />
              <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke={strokeColor}
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#lossGradient)"
                  clipPath="url(#clipBelow)"
              />
              {/* This invisible Area must be last to be the top layer for catching hover events across the whole curve. */}
              <Area type="monotone" dataKey="balance" fill="transparent" stroke="transparent" activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: strokeColor }} />
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
