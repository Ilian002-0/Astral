import { Trade, Account, ProcessedData, DashboardMetrics, ChartDataPoint, DailySummary, MaxDrawdown } from '../types';
import { getDayIdentifier } from './calendar';
import { spyData, BenchmarkDataPoint } from './benchmarkData';


// Helper function for linear interpolation of benchmark data
const getInterpolatedPrice = (targetDate: Date, data: BenchmarkDataPoint[]): number | null => {
    const targetTime = targetDate.getTime();

    // Find the points before and after the target date
    let beforePoint: BenchmarkDataPoint | null = null;
    let afterPoint: BenchmarkDataPoint | null = null;

    // Data is assumed to be sorted by date
    for (const point of data) {
        const pointTime = new Date(point.date).getTime();
        if (pointTime <= targetTime) {
            beforePoint = point;
        }
        if (pointTime >= targetTime) {
            afterPoint = point;
            break; 
        }
    }

    if (!beforePoint && !afterPoint) return null; // No data
    if (!afterPoint) return beforePoint!.price; // Date is after all data points
    if (!beforePoint) return afterPoint.price; // Date is before all data points

    const beforeTime = new Date(beforePoint.date).getTime();
    const afterTime = new Date(afterPoint.date).getTime();

    if (beforeTime === afterTime) {
        return beforePoint.price; // Exact match
    }

    const timeDiff = afterTime - beforeTime;
    const priceDiff = afterPoint.price - beforePoint.price;
    const targetDiff = targetTime - beforeTime;
    
    // Avoid division by zero if timeDiff is somehow 0
    if (timeDiff === 0) {
        return beforePoint.price;
    }

    const interpolatedPrice = beforePoint.price + (priceDiff * (targetDiff / timeDiff));
    return interpolatedPrice;
};


export const calculateBenchmarkPerformance = (startDate: Date, endDate: Date): number | null => {
  if (!spyData || spyData.length === 0) return null;

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

  // Assuming spyData is pre-sorted by date.
  const startPrice = getInterpolatedPrice(startDate, spyData);
  const endPrice = getInterpolatedPrice(endDate, spyData);

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
  
  const trades = validTrades;
  const { initialBalance } = account;
  
  const openTrades = trades.filter(t => t.closePrice === 0);
  const closedTrades = trades.filter(t => t.closePrice !== 0);

  const sortedOpenTrades = [...openTrades].sort((a, b) => b.openTime.getTime() - a.openTime.getTime());
  const sortedClosedTrades = [...closedTrades].sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());

  // --- Chart Data and Metrics Calculation ---
  const chartData: ChartDataPoint[] = [];
  let runningBalance = initialBalance;
  
  // 1. Add the true starting point of the account
  const firstTradeTime = sortedClosedTrades.length > 0 ? sortedClosedTrades[0].openTime.getTime() : Date.now();
  chartData.push({
    date: new Date(firstTradeTime - 1).toISOString().split('T')[0],
    balance: initialBalance,
    trade: null,
    index: 0,
    timestamp: firstTradeTime - 1,
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

  // 2. Iterate through closed trades to build the equity curve and calculate metrics
  sortedClosedTrades.forEach((trade, index) => {
    const netTradeProfit = trade.profit + trade.commission + trade.swap;
    runningBalance += netTradeProfit;

    chartData.push({
      date: trade.closeTime.toISOString().split('T')[0],
      balance: parseFloat(runningBalance.toFixed(2)),
      trade,
      index: index + 1, // index is based on number of closed trades
      timestamp: trade.closeTime.getTime(),
    });

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
    totalCommission += trade.commission;
    totalSwap += trade.swap;
    if (trade.profit > 0) {
        winningTradesCount++;
        grossProfit += trade.profit;
    } else {
        losingTradesCount++;
        grossLoss += trade.profit;
    }

    // Group Trades by Day using local time
    const day = getDayIdentifier(trade.closeTime);
    if (!tradesByDay[day]) {
      tradesByDay[day] = [];
    }
    tradesByDay[day].push(trade);
  });
  
  // Calculate P/L from trades opened today that are still open
  const todayKey = getDayIdentifier(new Date());
  const todaysOpenTrades = openTrades.filter(t => getDayIdentifier(t.openTime) === todayKey);
  const todaysFloatingPnl = todaysOpenTrades.reduce((sum, trade) => sum + (trade.profit + trade.commission + trade.swap), 0);

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
      
      balanceAtStartOfDay += dailyProfit;
  }

  const dailySummary = dailySummariesWithReturn.sort((a,b) => b.dateKey.localeCompare(a.dateKey));

  const lastTradeDayKey = Object.keys(tradesByDay).sort().pop();
  const lastDayProfit = lastTradeDayKey ? dailySummary.find(d => d.dateKey === lastTradeDayKey)?.profit || 0 : 0;
  
  let daysAgo = 0;
  if (lastTradeDayKey) {
    const [year, month, day] = lastTradeDayKey.split('-').map(Number);
    // This creates a date at midnight in the local timezone
    const lastTradeDayStart = new Date(year, month - 1, day);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Midnight in the local timezone

    const diffTime = todayStart.getTime() - lastTradeDayStart.getTime();
    daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
  
  const netProfit = grossProfit + grossLoss + totalCommission + totalSwap;
  const totalReturnPercent = initialBalance > 0 ? (netProfit / initialBalance) * 100 : 0;
  const closedTradesBalance = initialBalance + netProfit;
  const startOfDayBalance = closedTradesBalance - (daysAgo === 0 ? lastDayProfit : 0);

  const floatingPnl = openTrades.reduce((sum, trade) => sum + (trade.profit + trade.commission + trade.swap), 0);
  const equity = closedTradesBalance + floatingPnl;

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
    totalReturnPercent,
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