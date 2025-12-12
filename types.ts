
export interface Trade {
  ticket: number;
  openTime: Date;
  type: string;
  size: number;
  symbol: string;
  openPrice: number;
  closeTime: Date;
  closePrice: number;
  commission: number;
  swap: number;
  profit: number;
  comment: string;
}

export type GoalMetric = 'netProfit' | 'winRate' | 'profitFactor' | 'maxDrawdown';

export interface Goal {
  target: number;
  enabled: boolean;
  showOnChart?: boolean;
}

export type Goals = {
  [key in GoalMetric]?: Goal;
};

export interface Account {
  name: string;
  trades: Trade[];
  initialBalance: number;
  currency?: 'USD' | 'EUR';
  goals?: Goals;
  dataUrl?: string; // New: For fetching CSV data from a URL
  lastUpdated?: string; // New: ISO string to track last successful update
  activeStrategyIds?: string[]; // New: List of strategies active for this account
}

export interface ChartDataPoint {
  date: string; // Keep as string for display
  balance: number;
  trade: Trade | null;
  index: number;
  timestamp: number;
  isEquityPoint?: boolean;
  floatingPnl?: number;
}

// FIX: Add missing BenchmarkDataPoint interface.
export interface BenchmarkDataPoint {
  date: Date;
  close: number;
}

export interface DailySummary {
  dateKey: string; // YYYY-MM-DD UTC
  profit: number;
  dailyReturnPercent: number;
}

export interface ProcessedData {
  metrics: DashboardMetrics;
  chartData: ChartDataPoint[]; // Equity curve, includes a final point for current equity if open trades exist
  dailySummary: DailySummary[];
  recentTrades: Trade[];
  closedTrades: Trade[];
  openTrades: Trade[];
}

export interface MaxDrawdown {
  absolute: number;
  percentage: number;
}

export interface PositionStats {
    count: number;
    won: number;
    winRate: number;
}

export interface DashboardMetrics {
  totalBalance: number; // Represents Equity (Closed Balance + Floating P/L)
  floatingPnl: number;
  todaysFloatingPnl: number;
  startOfDayBalance: number;
  netProfit: number; // Represents realized P/L from closed trades
  winRate: number;
  totalOrders: number;
  profitFactor: number | null;
  maxDrawdown: MaxDrawdown;
  totalDeposits: number;
  totalWithdrawals: number;
  averageWin: number;
  averageLoss: number;
  winningTrades: number;
  losingTrades: number;
  lastDayProfit: number;
  lastDayProfitDaysAgo: number;
  totalCommission: number;
  totalSwap: number;
  grossProfit: number;
  grossLoss: number;
  totalReturnPercent: number;
  
  // Advanced Metrics
  expectedPayoff: number;
  largestProfitTrade: number;
  largestLossTrade: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  longPositions: PositionStats;
  shortPositions: PositionStats;
}

export interface CalendarDay {
  date: Date;
  profit: number;
  tradeCount: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface WeeklySummary {
  weekLabel: string;
  dateRange: string;
  pnl: number;
  tradingDays: number;
}

export interface CalendarSettings {
  hideWeekends: boolean;
}

export type AppView = 'dashboard' | 'trades' | 'calendar' | 'strategy' | 'analysis' | 'goals' | 'strategy-detail';

export interface NotificationSettings {
  tradeClosed: boolean;
  weeklySummary: boolean;
}

export interface Strategy {
  id: string;
  name: string;
  criteria: {
    comment?: string;
    magicNumber?: string;
  };
  createdAt: string;
}
