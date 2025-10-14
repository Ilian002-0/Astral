import { Trade, Account, ProcessedData, DashboardMetrics, ChartDataPoint, DailySummary, MaxDrawdown } from '../types';

// Helper to get start of day to avoid timezones issues
const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};


export const processAccountData = (account: Account | null): ProcessedData | null => {
  if (!account || !account.trades || account.trades.length === 0) {
    return null;
  }
  
  const { trades, initialBalance } = account;
  
  // Separate open and closed trades
  const openTrades = trades.filter(t => t.closePrice === 0);
  const closedTrades = trades.filter(t => t.closePrice !== 0);

  // Sort open trades by open time, most recent first
  const sortedOpenTrades = [...openTrades].sort((a, b) => b.openTime.getTime() - a.openTime.getTime());

  const sortedClosedTrades = [...closedTrades].sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());

  // --- Single-Pass Data Processing on Closed Trades ---
  let currentBalance = initialBalance;
  let peakBalance = initialBalance;
  let maxDrawdown: MaxDrawdown = { absolute: 0, percentage: 0 };
  
  let grossProfit = 0;
  let grossLoss = 0;
  let winningTradesCount = 0;
  let losingTradesCount = 0;
  let totalCommission = 0;
  let totalSwap = 0;

  const chartData: ChartDataPoint[] = [];
  const tradesByDay: { [key: string]: Trade[] } = {};

  sortedClosedTrades.forEach((trade, index) => {
    // Net Profit Calculation
    const netTradeProfit = trade.profit + trade.commission + trade.swap;
    currentBalance += netTradeProfit;
    
    // Balance Chart Data
    chartData.push({
      date: trade.closeTime.toISOString().split('T')[0],
      balance: parseFloat(currentBalance.toFixed(2)),
      trade,
      index: index + 1, // Start trade indices from 1
      timestamp: trade.closeTime.getTime(),
    });

    // Max Drawdown Calculation
    if (currentBalance > peakBalance) {
      peakBalance = currentBalance;
    }
    const drawdown = peakBalance - currentBalance;
    if (drawdown > maxDrawdown.absolute) {
      maxDrawdown.absolute = drawdown;
      if (peakBalance > 0) {
        maxDrawdown.percentage = (drawdown / peakBalance) * 100;
      }
    }

    // Aggregate Metrics
    totalCommission += trade.commission;
    totalSwap += trade.swap;
    if (trade.profit > 0) {
        winningTradesCount++;
        grossProfit += trade.profit;
    } else {
        losingTradesCount++;
        grossLoss += trade.profit;
    }

    // Group Trades by Day
    const day = trade.closeTime.toISOString().split('T')[0];
    if (!tradesByDay[day]) {
      tradesByDay[day] = [];
    }
    tradesByDay[day].push(trade);
  });
  // --- End of Single Pass ---

  // Calculate daily summaries with return percentage
  const sortedDayKeys = Object.keys(tradesByDay).sort((a, b) => a.localeCompare(b));
  let balanceAtStartOfDay = initialBalance;
  const dailySummariesWithReturn: DailySummary[] = [];

  for (const dateKey of sortedDayKeys) {
      const dailyTrades = tradesByDay[dateKey];
      const dailyProfit = dailyTrades.reduce((sum, t) => sum + (t.profit + t.commission + t.swap), 0);
      const dailyReturnPercent = balanceAtStartOfDay > 0 ? (dailyProfit / balanceAtStartOfDay) * 100 : 0;
      
      dailySummariesWithReturn.push({
          dateKey: dateKey,
          profit: dailyProfit,
          dailyReturnPercent: dailyReturnPercent,
      });
      
      balanceAtStartOfDay += dailyProfit; // Update balance for the next day
  }

  // FIX: Corrected typo in sort function from a.b to a.dateKey
  const dailySummary = dailySummariesWithReturn.sort((a,b) => b.dateKey.localeCompare(a.dateKey)); // Sort descending for display

  // Calculate profit from the last day with trading activity
  const lastTradeDayKey = Object.keys(tradesByDay).sort().pop();
  const lastDayProfit = lastTradeDayKey ? dailySummary.find(d => d.dateKey === lastTradeDayKey)?.profit || 0 : 0;
  
  let daysAgo = 0;
  if (lastTradeDayKey) {
    const lastTradeDayStart = getStartOfDay(new Date(lastTradeDayKey + 'T00:00:00Z'));
    const todayStart = getStartOfDay(new Date());
    const diffTime = todayStart.getTime() - lastTradeDayStart.getTime();
    daysAgo = Math.round(diffTime / (1000 * 60 * 60 * 24));
  }
  
  const netProfit = grossProfit + grossLoss + totalCommission + totalSwap;
  const closedTradesBalance = initialBalance + netProfit;

  // Calculate Floating P/L and Equity
  const floatingPnl = openTrades.reduce((sum, trade) => sum + (trade.profit + trade.commission + trade.swap), 0);
  const equity = closedTradesBalance + floatingPnl;

  // If there are open trades, add the current equity as the last point of the chart data.
  if (openTrades.length > 0) {
      const lastIndex = chartData.length > 0 ? chartData[chartData.length - 1].index : 0;
      const equityPoint: ChartDataPoint = {
          date: new Date().toISOString().split('T')[0],
          balance: equity,
          trade: null,
          // Position it slightly after the last trade on the x-axis for visual separation
          index: lastIndex + 1,
          timestamp: Date.now(),
          isEquityPoint: true,
          floatingPnl: floatingPnl,
      };
      chartData.push(equityPoint);
  }


  const metrics: DashboardMetrics = {
    totalBalance: equity,
    floatingPnl,
    netProfit,
    winRate: sortedClosedTrades.length > 0 ? (winningTradesCount / sortedClosedTrades.length) * 100 : 0,
    totalOrders: sortedClosedTrades.length,
    profitFactor: grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : null,
    maxDrawdown,
    totalDeposits: initialBalance,
    totalWithdrawals: 0,
    averageWin: winningTradesCount > 0 ? grossProfit / winningTradesCount : 0,
    averageLoss: losingTradesCount > 0 ? grossLoss / losingTradesCount : 0,
    winningTrades: winningTradesCount,
    losingTrades: losingTradesCount,
    lastDayProfit: lastDayProfit,
    lastDayProfitDaysAgo: daysAgo,
    totalCommission,
    totalSwap,
    grossProfit,
    grossLoss,
  };

  const recentTrades = sortedClosedTrades.slice(-6).reverse();

  return {
    metrics,
    chartData,
    dailySummary,
    recentTrades,
    closedTrades: sortedClosedTrades,
    openTrades: sortedOpenTrades,
  };
};