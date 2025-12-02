
import React from 'react';
import { ChartDataPoint } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  currency: 'USD' | 'EUR';
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, currency }) => {
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
    
    // Monthly Bar Chart
    if (payload[0].payload.month) {
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
    
    // Pie Chart
    if (payload[0].name && payload[0].value !== undefined && !payload[0].payload.date) {
        const { name, value } = payload[0];
        return (
            <div className="bg-[#16152c]/90 backdrop-blur-sm border border-gray-700 p-2 rounded-lg shadow-xl text-xs">
                <span className="text-gray-300">{name}: </span>
                <span className="font-bold text-white">{value} trades</span>
            </div>
        );
    }

    // Area Chart (Equity) & Balance Chart
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

export default CustomTooltip;
