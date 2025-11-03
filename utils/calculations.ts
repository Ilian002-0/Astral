
import { Trade, Account, ProcessedData, DashboardMetrics, ChartDataPoint, DailySummary, MaxDrawdown, BenchmarkDataPoint } from '../types';
import { getDayIdentifier } from './calendar';

// Finds the closing price for the first available trading day on or after the target date.
const findPriceOnOrAfter = (targetDate: Date, data: BenchmarkDataPoint[]): number | null => {
    // Assumes data is sorted by date ascending
    const targetTime = targetDate.getTime();
    for (const point of data) {
        if (point.date.getTime() >= targetTime) {
            return point.close;
        }
    }
    return null; // No date found on or after
};

export const calculateBenchmarkPerformance = (startDate: Date, data: BenchmarkDataPoint[] | null): number | null => {
  if (!data || data.length === 0) return null;
  if (isNaN(startDate.getTime())) return null;

  // Find the closing price for the first available trading day on or after the start date.
  const startPrice = findPriceOnOrAfter(startDate, data);
  
  // Per user request, the end price is always the last available price in the benchmark data.
  const endPrice = data[data.length - 1].close;

  if (startPrice === null || endPrice === null || startPrice === 0) {
    return null;
  }

  const returnPercent = ((endPrice - startPrice) / startPrice) * 100;
  return returnPercent;
};


export const processAccountData = (account: Account | null): ProcessedData | null => {
  if (!account || !account.trades || account.trades.length === 0) {
    return null;
  }
  
  const validTrades = account.trades.filter(t =>
    t && t.openTime instanceof Date && t.closeTime instanceof Date
  );

  if (validTrades.length === 0) {
    return null;
  }
  
  const { initialBalance } = account;
  
  // Separate all operations based on their nature
  const closedOperations = validTrades
    .filter(t => t.closePrice !== 0 || t.type === 'balance')
    .sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());
    
  const openTrades = validTrades.filter(t => t.closePrice === 0 && t.type !== 'balance');
  
  // For calculating trading metrics, we only want actual trades, not balance operations
  const closedTrades = closedOperations.filter(op => op.type !== 'balance');

  // For display purposes, sort by most recent
  const sortedOpenTrades = [...openTrades].sort((a, b) => b.openTime.getTime() - a.openTime.getTime());
  const sortedClosedTrades = [...closedTrades].sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());

  // --- Chart Data and Metrics Calculation ---
  const chartData: ChartDataPoint[] = [];
  let runningBalance = initialBalance;
  
  // 1. Add the true starting point of the account
  const firstOpTime = closedOperations.length > 0 ? closedOperations[0].closeTime.getTime() : Date.now();
  chartData.push({
    date: new Date(firstOpTime - 1).toISOString().split('T')[0],
    balance: initialBalance,
    trade: null,
    index: 0,
    timestamp: firstOpTime - 1,
  });

  let peakBalance = initialBalance;
  let maxDrawdown: MaxDrawdown = { absolute: 0, percentage: 0 };
  let grossProfit = 0;
  let grossLoss = 0;
  let winningTradesCount = 0;
  let losingTradesCount = 0;
  let totalCommission = 0;
  let totalSwap = 0;
  const tradesByDay: { [key: string]: Trade[] } = {};

  // 2. Iterate through all closed operations chronologically to build equity curve
  closedOperations.forEach((operation, index) => {
    const netValue = operation.profit + operation.commission + operation.swap;
    runningBalance += netValue;

    chartData.push({
      date: operation.closeTime.toISOString().split('T')[0],
      balance: parseFloat(runningBalance.toFixed(2)),
      trade: operation,
      index: index + 1, 
      timestamp: operation.closeTime.getTime(),
    });

    // Only calculate trading-specific metrics for actual trades
    if (operation.type !== 'balance') {
      // Max Drawdown Calculation
      if (runningBalance > peakBalance) {
        peakBalance = runningBalance;
      }
      const drawdown = peakBalance - runningBalance;
      if (drawdown > maxDrawdown.absolute) {
        maxDrawdown.absolute = drawdown;
        if (peakBalance > 0) {
          maxDrawdown.percentage = (drawdown / peakBalance) * 100;
        }
      }

      // Aggregate Metrics
      totalCommission += operation.commission;
      totalSwap += operation.swap;
      if (operation.profit > 0) {
          winningTradesCount++;
          grossProfit += operation.profit;
      } else {
          losingTradesCount++;
          grossLoss += operation.profit;
      }

      // Group Trades by Day using local time
      const day = getDayIdentifier(operation.closeTime);
      if (!tradesByDay[day]) {
        tradesByDay[day] = [];
      }
      tradesByDay[day].push(operation);
    }
  });
  
  // Calculate total deposits/withdrawals from balance operations
  const totalDepositsFromOps = closedOperations
    .filter(op => op.type === 'balance' && op.profit > 0)
    .reduce((sum, op) => sum + op.profit, 0);
  const totalWithdrawalsFromOps = closedOperations
    .filter(op => op.type === 'balance' && op.profit < 0)
    .reduce((sum, op) => sum + op.profit, 0);

  // Calculate P/L from trades opened today that are still open
  const todayKey = getDayIdentifier(new Date());
  const todaysOpenTrades = openTrades.filter(t => getDayIdentifier(t.openTime) === todayKey);
  const todaysFloatingPnl = todaysOpenTrades.reduce((sum, trade) => sum + (trade.profit + trade.commission + trade.swap), 0);

  // Calculate daily summaries. Simpler logic for now.
  const dailySummary = Object.entries(tradesByDay)
    .map(([dateKey, dailyTrades]) => ({
      dateKey,
      profit: dailyTrades.reduce((sum, t) => sum + t.profit + t.commission + t.swap, 0),
      dailyReturnPercent: 0, // This is complex to calculate accurately with deposits, simplifying.
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const lastTradeDayKey = Object.keys(tradesByDay).sort().pop();
  const lastDayProfit = lastTradeDayKey ? dailySummary.find(d => d.dateKey === lastTradeDayKey)?.profit || 0 : 0;
  
  let daysAgo = 0;
  if (lastTradeDayKey) {
    const [year, month, day] = lastTradeDayKey.split('-').map(Number);
    const lastTradeDayStart = new Date(year, month - 1, day);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const diffTime = todayStart.getTime() - lastTradeDayStart.getTime();
    daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // Calculate balance at the start of today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayTimestamp = startOfToday.getTime();
  const opsBeforeToday = closedOperations.filter(op => op.closeTime.getTime() < startOfTodayTimestamp);
  const startOfDayBalance = initialBalance + opsBeforeToday.reduce((sum, op) => sum + op.profit + op.commission + op.swap, 0);

  const netProfit = grossProfit + grossLoss + totalCommission + totalSwap;
  const totalInvested = initialBalance + totalDepositsFromOps;
  const totalReturnPercent = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
  
  const finalClosedBalance = initialBalance + closedOperations.reduce((sum, op) => sum + op.profit + op.commission + op.swap, 0);

  const floatingPnl = openTrades.reduce((sum, trade) => sum + (trade.profit + trade.commission + trade.swap), 0);
  const equity = finalClosedBalance + floatingPnl;

  if (openTrades.length > 0 || chartData.length === 1) { // If only initial point exists
      const lastIndex = chartData[chartData.length - 1].index;
      const equityPoint: ChartDataPoint = {
          date: new Date().toISOString().split('T')[0],
          balance: equity,
          trade: null,
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
    todaysFloatingPnl,
    startOfDayBalance,
    netProfit,
    winRate: closedTrades.length > 0 ? (winningTradesCount / closedTrades.length) * 100 : 0,
    totalOrders: closedTrades.length,
    profitFactor: grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : null,
    maxDrawdown,
    totalDeposits: initialBalance + totalDepositsFromOps,
    totalWithdrawals: Math.abs(totalWithdrawalsFromOps),
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
    totalReturnPercent,
  };

  const recentTrades = [...closedTrades].sort((a, b) => b.closeTime.getTime() - a.closeTime.getTime()).slice(0, 6);

  return {
    metrics,
    chartData,
    dailySummary,
    recentTrades,
    closedTrades: sortedClosedTrades,
    openTrades: sortedOpenTrades,
  };
};
