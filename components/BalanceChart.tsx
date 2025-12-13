
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { ChartDataPoint, Goals } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import useMediaQuery from '../hooks/useMediaQuery';
import { triggerHaptic } from '../utils/haptics';
import CustomTooltip from './charts/CustomTooltip';

type TimeRange = 'today' | 'week' | 'month' | 'all';

interface BalanceChartProps {
  data: ChartDataPoint[];
  onAdvancedAnalysisClick?: () => void;
  initialBalance: number;
  currency: 'USD' | 'EUR';
  goals: Goals;
  hideControls?: boolean;
}

const BalanceChart: React.FC<BalanceChartProps> = ({ data, onAdvancedAnalysisClick, initialBalance, currency, goals, hideControls = false }) => {
  const { t, language } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const chartRef = useRef<HTMLDivElement>(null);
  const lastActiveIndex = useRef<number | null>(null);

  const profitGoal = goals?.netProfit;
  const drawdownGoal = goals?.maxDrawdown;

  useEffect(() => {
    if (!chartRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
                // Fix: Use setTimeout to push state update to end of event loop
                // This prevents the "width(-1)" warning by ensuring layout is complete
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
    
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
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
    
    // Use compact notation for large numbers (e.g., 50k, 1M) for better readability
    return new Intl.NumberFormat(language, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
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

    // If controls are hidden (e.g. strategy detail), we typically want to show ALL data or default behavior
    // But keeping it consistent with 'month' default or 'all' might be better. 
    // Let's stick to the selected timeRange logic, but if hidden, maybe default to 'all' is better?
    // For now, we respect the state.

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
  
  const xDomain = useMemo(() => {
      if (!hasAnyData) return [0, 1];
      const indices = filteredData.map(d => d.index);
      const min = Math.min(...indices);
      const max = Math.max(...indices);
      return [min, max === min ? max + 1 : max];
  }, [filteredData, hasAnyData]);

  // Dynamically calculate Y-Axis domain to ensure Goals are visible
  const yDomain = useMemo(() => {
      if (!hasAnyData) return ['auto', 'auto'];

      const balances = filteredData.map(d => d.balance);
      let min = Math.min(...balances);
      let max = Math.max(...balances);

      // Add default padding (10% range or 5% value)
      const range = max - min;
      const padding = range > 0 ? range * 0.1 : Math.abs(min * 0.05) || 100;
      
      min -= padding;
      max += padding;

      // Expand to include Profit Target
      if (profitGoal?.enabled && profitGoal.showOnChart && profitGoal.target) {
          const targetY = initialBalance + profitGoal.target;
          // Set max exactly to targetY if it's higher, to avoid wasted space at top
          if (targetY > max) max = targetY; 
      }

      // Expand to include Drawdown Limit
      if (drawdownGoal?.enabled && drawdownGoal.showOnChart && drawdownGoal.target) {
          const targetY = initialBalance - (initialBalance * (drawdownGoal.target / 100));
          // Set min exactly to targetY if it's lower, to avoid wasted space at bottom
          if (targetY < min) min = targetY;
      }

      return [min, max];
  }, [filteredData, hasAnyData, profitGoal, drawdownGoal, initialBalance]);

  return (
    <div className="bg-[#16152c] p-4 sm:p-6 rounded-3xl shadow-lg border border-gray-700/50 overflow-hidden">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h3 className="text-lg font-semibold text-white">{t('dashboard.balance_chart_title')}</h3>
        
        {!hideControls && (
            <div className="flex items-center gap-2">
                {onAdvancedAnalysisClick && (
                    <button
                        onClick={onAdvancedAnalysisClick}
                        className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-sm text-cyan-300 rounded-2xl shadow-sm transition-colors"
                        >
                        {t('dashboard.advanced_analysis')}
                    </button>
                )}
                <div className="relative" ref={dropdownRef}>
                    <button
                    onClick={() => setDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-between w-36 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-sm text-gray-300 rounded-2xl shadow-sm transition-colors"
                    aria-haspopup="true"
                    aria-expanded={isDropdownOpen}
                    >
                    <span className="truncate">{currentLabel}</span>
                    <svg className={`w-4 h-4 ml-2 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-36 bg-gray-800 border border-gray-700 rounded-2xl shadow-lg z-10 animate-fade-in-fast overflow-hidden">
                            <ul className="py-1">
                                {timeRangeOptions.map(({ key, label }) => (
                                    <li key={key}>
                                        <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); handleSelect(key); }}
                                        className={`block px-4 py-2 text-sm mx-1 my-1 rounded-xl transition-all ${key === timeRange ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
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
        )}
      </div>
      <div style={{ width: '100%', height: isMobile ? 300 : 400 }} ref={chartRef}>
        {hasAnyData ? (
          isMounted ? (
            // CRITICAL FIX: minWidth={0} and minHeight={0} are required to prevent Recharts "width(-1)" warning
            // during initial render or layout shifts. Do not remove.
            <ResponsiveContainer key={timeRange} width="100%" height={isMobile ? 300 : 400} minWidth={0} minHeight={0}>
              <AreaChart
                data={filteredData}
                onMouseMove={handleChartMouseMove}
                onMouseLeave={() => (lastActiveIndex.current = null)}
                margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? 0 : 0, bottom: 5 }}
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
                  tickLine={false}
                  axisLine={false}
                  type="number"
                  domain={yDomain}
                  width={isMobile ? 40 : 60}
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
                        <Label value={t('goals.profit_target_label')} position="insideRight" fill="#22c55e" fontSize={12} dy={12} />
                    </ReferenceLine>
                )}
                {drawdownGoal?.enabled && drawdownGoal.showOnChart && drawdownGoal.target && (
                    <ReferenceLine y={initialBalance - (initialBalance * (drawdownGoal.target / 100))} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2}>
                        <Label value={t('goals.drawdown_target_label')} position="insideRight" fill="#ef4444" fontSize={12} dy={-12} />
                    </ReferenceLine>
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : null // Don't render "No Data" if we are just waiting for mount, render nothing to avoid flicker
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
