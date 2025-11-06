import { Trade, CalendarDay, WeeklySummary } from '../types';

export const getDayIdentifier = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const generateCalendarData = (trades: Trade[], displayDate: Date, language: string) => {
    const tradesByDate: { [key: string]: { profit: number, tradeCount: number } } = {};
    
    trades.forEach(trade => {
        const dayId = getDayIdentifier(trade.closeTime);
        if (!tradesByDate[dayId]) {
            tradesByDate[dayId] = { profit: 0, tradeCount: 0 };
        }
        tradesByDate[dayId].profit += (trade.profit + trade.commission + trade.swap);
        tradesByDate[dayId].tradeCount += 1;
    });

    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const today = new Date();
    const todayId = getDayIdentifier(today);

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const calendarDays: CalendarDay[] = [];

    // Add days from the previous month
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday...
    const daysToPad = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Assuming week starts on Monday

    for (let i = daysToPad; i > 0; i--) {
        const date = new Date(year, month, 1 - i);
        calendarDays.push({ date, profit: 0, tradeCount: 0, isCurrentMonth: false, isToday: false });
    }

    // Add days for the current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const date = new Date(year, month, day);
        const dayId = getDayIdentifier(date);
        const data = tradesByDate[dayId] || { profit: 0, tradeCount: 0 };
        calendarDays.push({ ...data, date, isCurrentMonth: true, isToday: dayId === todayId });
    }
    
    // Add days from the next month to fill out the last week
    const totalCells = calendarDays.length;
    const cellsToPadEnd = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= cellsToPadEnd; i++) {
        const date = new Date(year, month + 1, i);
        calendarDays.push({ date, profit: 0, tradeCount: 0, isCurrentMonth: false, isToday: false });
    }

    const calendarWeeks: CalendarDay[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
        calendarWeeks.push(calendarDays.slice(i, i + 7));
    }

    const relevantWeekIndexes: number[] = [];
    calendarWeeks.forEach((week, index) => {
        if (week.some(day => day.isCurrentMonth)) {
            relevantWeekIndexes.push(index);
        }
    });

    const weeklySummaries: WeeklySummary[] = calendarWeeks.map((weekDays, index) => {
        const tradeDaysInWeek = weekDays.filter(d => d.tradeCount > 0 && d.isCurrentMonth);
        const pnl = tradeDaysInWeek.reduce((sum, day) => sum + day.profit, 0);
        const tradingDays = tradeDaysInWeek.length;
        
        const relevantWeekNumber = relevantWeekIndexes.indexOf(index);

        return {
            weekLabel: relevantWeekNumber !== -1 ? `Week ${relevantWeekNumber + 1}` : ' ',
            dateRange: '', // Not used in UI card, keep for type compatibility
            pnl,
            tradingDays
        };
    });

    const monthlyProfit = calendarDays
        .filter(day => day.isCurrentMonth)
        .reduce((sum, day) => sum + day.profit, 0);

    return { calendarDays, weeklySummaries, monthlyProfit };
};