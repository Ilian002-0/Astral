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
    
    // Add days from the next month to fill the grid (6 weeks * 7 days = 42 cells)
    const remainingCells = 42 - calendarDays.length;
    for (let i = 1; i <= remainingCells; i++) {
        const date = new Date(year, month + 1, i);
        calendarDays.push({ date, profit: 0, tradeCount: 0, isCurrentMonth: false, isToday: false });
    }

    // If the calendar grid extends to 6 weeks, check if the last week is entirely
    // composed of days from the next month. If so, remove it for a tighter view.
    if (calendarDays.length > 35) {
        const lastWeek = calendarDays.slice(35);
        if (!lastWeek.some(day => day.isCurrentMonth)) {
            calendarDays.splice(35);
        }
    }

    const weeklySummaries: WeeklySummary[] = [];
    const monthWeeks: CalendarDay[][] = [];
    
    // Group all calendar days into weeks
    let currentWeek: CalendarDay[] = [];
    calendarDays.forEach(day => {
        currentWeek.push(day);
        if (day.date.getDay() === 0) { // Sunday
            monthWeeks.push(currentWeek);
            currentWeek = [];
        }
    });
    if (currentWeek.length > 0) {
        monthWeeks.push(currentWeek);
    }
    
    // Filter to get only weeks that contain at least one day from the display month
    const relevantWeeks = monthWeeks.filter(week => week.some(day => day.isCurrentMonth));

    relevantWeeks.forEach((weekDays, index) => {
        const tradeDaysInWeek = weekDays.filter(d => d.tradeCount > 0 && d.isCurrentMonth);
        const pnl = tradeDaysInWeek.reduce((sum, day) => sum + day.profit, 0);
        const tradingDays = tradeDaysInWeek.length;
        
        const startDate = weekDays[0].date;
        const endDate = weekDays[weekDays.length - 1].date;

        const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const startDateStr = startDate.toLocaleDateString(language, formatOptions);
        const endDateStr = endDate.toLocaleDateString(language, formatOptions);
        
        weeklySummaries.push({
            weekLabel: `Week ${index + 1}`,
            dateRange: `${startDateStr} - ${endDateStr}`,
            pnl,
            tradingDays
        });
    });

    const monthlyProfit = calendarDays
        .filter(day => day.isCurrentMonth)
        .reduce((sum, day) => sum + day.profit, 0);

    return { calendarDays, weeklySummaries, monthlyProfit };
};