import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { Trade, ChartDataPoint, Account } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import MultiSelectDropdown from './MultiSelectDropdown';
import FilteredTradesTable from './FilteredTradesTable';
import useMediaQuery from '../hooks/useMediaQuery';

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

    if (!dataPoint.trade) {
        const label = dataPoint.index === 0 ? 'Initial Balance' : 'Balance Before Filter';
        return (
             <div className="bg-[#16152c]/90 backdrop-blur-sm border border-gray-700 p-3 rounded-lg shadow-xl text-sm">
                <p className="font-bold text-lg text-white mb-1">{label}</p>
                <p className="text-gray-400">{formatCurrency(dataPoint.balance)}</p>
            </div>
        );
    }
    
    const { trade, balance, timestamp } = dataPoint;
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
  return null;
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ trades, initialBalance, onBackToDashboard, currency }) => {
    const { t, language } = useLanguage();
    const isDesktop = useMediaQuery('(min-width: 768px)');

    const chartRef = useRef<HTMLDivElement>(null);
    const [showTooltip, setShowTooltip] = useState(true);

    const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
    const [selectedComments, setSelectedComments] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const animationKey = useMemo(() => {
        return `${selectedSymbols.join(',')}-${selectedComments.join(',')}-${startDate}-${endDate}`;
    }, [selectedSymbols, selectedComments, startDate, endDate]);
    
    useEffect(() => {
        const node = chartRef.current;
        if (node && !isDesktop) {
            const handleTouchEnd = () => {
                setShowTooltip(false);
                setTimeout(() => setShowTooltip(true), 50);
            };
            node.addEventListener('touchend', handleTouchEnd);
            return () => {
                node.removeEventListener('touchend', handleTouchEnd);
            };
        }
    }, [isDesktop]);

    const uniqueSymbols = useMemo(() => [...new Set(trades.map(t => t.symbol))].sort(), [trades]);
    const uniqueComments = useMemo(() => [...new Set(trades.map(t => t.comment).filter(c => !!c))].sort(), [trades]);

    const filteredTrades = useMemo(() => {
        return trades.filter(trade => {
            const symbolMatch = selectedSymbols.length === 0 || selectedSymbols.includes(trade.symbol);
            const commentMatch = selectedComments.length === 0 || selectedComments.includes(trade.comment);
            
            const startMatch = !startDate || trade.closeTime.getTime() >= new Date(startDate).getTime();
            const endMatch = !endDate || trade.closeTime.getTime() <= new Date(endDate).setHours(23, 59, 59, 999);

            return symbolMatch && commentMatch && startMatch && endMatch;
        });
    }, [trades, selectedSymbols, selectedComments, startDate, endDate]);

    const yAxisTickFormatter = (value: number) => {
        const thousands = value / 1000;
        const formattedValue = new Intl.NumberFormat(language, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }).format(thousands) + 'K';
        return formattedValue;
    };

    const filteredProfit = useMemo(() => {
        return filteredTrades.reduce((sum, trade) => sum + (trade.profit + trade.commission + trade.swap), 0);
    }, [filteredTrades]);

    const { chartData, baseBalanceForChart } = useMemo(() => {
        const sortedFilteredTrades = [...filteredTrades].sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());

        if (sortedFilteredTrades.length === 0) {
            const emptyStartPoint: ChartDataPoint = {
                date: new Date().toISOString().split('T')[0],
                balance: initialBalance,
                trade: null,
                index: 0,
                timestamp: Date.now(),
            };
            return { chartData: [emptyStartPoint], baseBalanceForChart: initialBalance };
        }

        const firstFilteredTrade = sortedFilteredTrades[0];
        const firstFilteredTradeOriginalIndex = trades.findIndex(t => t.ticket === firstFilteredTrade.ticket);
        
        const tradesBefore = firstFilteredTradeOriginalIndex > 0 ? trades.slice(0, firstFilteredTradeOriginalIndex) : [];
        const balanceBefore = initialBalance + tradesBefore.reduce((sum, t) => sum + (t.profit + t.commission + t.swap), 0);
        
        let currentBalance = balanceBefore;
        
        const dataPoints: ChartDataPoint[] = sortedFilteredTrades.map((trade, idx) => {
            currentBalance += (trade.profit + trade.commission + trade.swap);
            return {
                date: trade.closeTime.toISOString().split('T')[0],
                balance: parseFloat(currentBalance.toFixed(2)),
                trade,
                index: idx + 1,
                timestamp: trade.closeTime.getTime(),
            };
        });

        const startingTimestamp = firstFilteredTrade.openTime.getTime() - 1;

        const startingPoint: ChartDataPoint = {
            date: new Date(startingTimestamp).toISOString().split('T')[0],
            balance: parseFloat(balanceBefore.toFixed(2)),
            trade: null,
            index: 0,
            timestamp: startingTimestamp,
        };

        return { chartData: [startingPoint, ...dataPoints], baseBalanceForChart: balanceBefore };
    }, [filteredTrades, initialBalance, trades]);
    
    const hasEnoughData = chartData && chartData.length >= 2;
  
    const strokeColor = '#f87171';
    const profitFillColor = 'rgb(13 148 136)';
    const lossFillColor = 'rgb(159 18 57)';
    const grayColor = '#6b7280';

    const formatCurrency = (value: number) => {
        const symbol = currency === 'USD' ? '$' : '€';
        const sign = value >= 0 ? '+' : '-';
        const absNumberPart = new Intl.NumberFormat(language, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(value));
        if (language === 'fr') {
            return `${sign}${absNumberPart}${symbol}`;
        }
        return `${sign}${symbol}${absNumberPart}`;
    };

    const chartDomain = useMemo(() => {
        if (!hasEnoughData) return { domainMin: baseBalanceForChart * 0.95, domainMax: baseBalanceForChart * 1.05 };
    
        const balanceValues = chartData.map(d => d.balance);
        const minBalance = Math.min(...balanceValues);
        const maxBalance = Math.max(...balanceValues);
        const range = maxBalance - minBalance;
        
        let padding = range === 0 ? (maxBalance > 0 ? maxBalance * 0.1 : 1000) : range * 0.05;
    
        const domainMin = Math.floor(minBalance - padding);
        const domainMax = Math.ceil(maxBalance + padding);
        return { domainMin, domainMax };
      }, [chartData, hasEnoughData, baseBalanceForChart]);
    
    const { domainMin, domainMax } = chartDomain;
    
    return (
        <div className="space-y-6">
            {!isDesktop && (
                <button onClick={onBackToDashboard} className="flex items-center space-x-2 text-cyan-400 mb-4 font-semibold hover:text-cyan-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{t('analysis.back_to_dashboard')}</span>
                </button>
            )}
            <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
                <h2 className="text-2xl font-bold text-white mb-4 text-center">{t('analysis.title')}</h2>
                
                <div className="text-center mb-6">
                    <h3 className="text-lg text-gray-400">{t('analysis.filtered_profit_title')}</h3>
                    <p className={`text-4xl font-bold ${filteredProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(filteredProfit)}
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <MultiSelectDropdown 
                        options={uniqueSymbols}
                        selectedOptions={selectedSymbols}
                        onChange={setSelectedSymbols}
                        placeholder={t('analysis.filter_symbols_placeholder')}
                        title={t('analysis.filter_symbols_title')}
                        itemNamePlural={t('analysis.item_name_symbols')}
                    />
                     <MultiSelectDropdown 
                        options={uniqueComments}
                        selectedOptions={selectedComments}
                        onChange={setSelectedComments}
                        placeholder={t('analysis.filter_comments_placeholder')}
                        title={t('analysis.filter_comments_title')}
                        itemNamePlural={t('analysis.item_name_comments')}
                    />
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-300 mb-2">{t('analysis.start_date')}</label>
                        <input
                            type="date"
                            id="start-date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-[#0c0b1e] border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-300 mb-2">{t('analysis.end_date')}</label>
                        <input
                            type="date"
                            id="end-date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            className="w-full px-3 py-2 bg-[#0c0b1e] border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                </div>

                <div style={{ width: '100%', height: 400 }} ref={chartRef}>
                    {hasEnoughData ? (
                        <ResponsiveContainer key={animationKey}>
                            <AreaChart data={chartData} margin={{ top: 5, right: !isDesktop ? 5 : 20, left: !isDesktop ? -10 : -30, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="analysisProfitFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={profitFillColor} stopOpacity={0.7}/>
                                        <stop offset="95%" stopColor={profitFillColor} stopOpacity={0.4}/>
                                    </linearGradient>
                                    <linearGradient id="analysisLossFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={lossFillColor} stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor={lossFillColor} stopOpacity={0.7}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis dataKey="index" stroke="#888" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} />
                                <YAxis stroke="#888" tick={{ fontSize: 12 }} tickFormatter={yAxisTickFormatter} domain={[domainMin, domainMax]} tickLine={false} axisLine={false} allowDataOverflow />
                                {showTooltip && <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '3 3' }}/>}
                                
                                <Area
                                    isAnimationActive={true}
                                    animationDuration={800}
                                    animationEasing="ease-out"
                                    type="monotone"
                                    dataKey={(d) => (d.balance >= baseBalanceForChart ? d.balance : baseBalanceForChart)}
                                    baseValue={baseBalanceForChart}
                                    stroke="none"
                                    fill="url(#analysisProfitFill)"
                                />
                                
                                <Area
                                    isAnimationActive={true}
                                    animationDuration={800}
                                    animationEasing="ease-out"
                                    type="monotone"
                                    dataKey={(d) => (d.balance < baseBalanceForChart ? d.balance : baseBalanceForChart)}
                                    baseValue={baseBalanceForChart}
                                    stroke="none"
                                    fill="url(#analysisLossFill)"
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
                                
                                <ReferenceLine y={baseBalanceForChart} stroke={grayColor} strokeDasharray="3 3" strokeWidth={1.5}>
                                    <Label value="Initial" position="insideRight" fill={grayColor} fontSize={10} dy={-4} />
                                </ReferenceLine>
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="flex flex-col justify-center items-center h-full text-center">
                            <p className="text-gray-400">{t('dashboard.chart_no_data')}</p>
                        </div>
                    )}
                </div>
            </div>

            <FilteredTradesTable trades={filteredTrades.sort((a,b) => b.closeTime.getTime() - a.closeTime.getTime())} currency={currency} />
        </div>
    );
}

export default AnalysisView;