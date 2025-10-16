import React, { useState, useMemo } from 'react';
import { Trade, CalendarDay } from '../types';
import { generateCalendarData } from '../utils/calendar';
import { useLanguage } from '../contexts/LanguageContext';
import useMediaQuery from '../hooks/useMediaQuery';

interface CalendarViewProps {
    trades: Trade[];
    onDayClick: (date: Date) => void;
    currency: 'USD' | 'EUR';
}

const CalendarHeader: React.FC<{
    displayDate: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
}> = ({ displayDate, onPrevMonth, onNextMonth }) => {
    const { language } = useLanguage();
    const monthYear = displayDate.toLocaleDateString(language, {
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="flex justify-between items-center mb-4">
            <button onClick={onPrevMonth} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-xl font-bold text-white">{monthYear}</h2>
            <button onClick={onNextMonth} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    );
};

const CalendarDayCell: React.FC<{ day: CalendarDay; onClick: () => void; formatCurrency: (value: number) => string; }> = ({ day, onClick, formatCurrency }) => {
    const { t } = useLanguage();
    const isMobile = useMediaQuery('(max-width: 640px)');

    const profitColor = day.profit > 0 ? 'text-green-400' : 'text-red-400';
    const cellClasses = `relative aspect-square flex flex-col justify-between p-2 rounded-lg transition-all duration-300
        ${day.isCurrentMonth ? 'bg-gray-800/50' : 'bg-transparent text-gray-600'}
        ${day.tradeCount > 0 ? 'border border-gray-600 cursor-pointer hover:bg-gray-700 hover:scale-105' : ''}
        ${day.isToday && day.isCurrentMonth ? 'ring-2 ring-cyan-400' : ''}`;

    const tradeText = isMobile
      ? `(${day.tradeCount})`
      : `${day.tradeCount} ${day.tradeCount > 1 ? t('calendar.trades') : t('calendar.trade')}`;

    return (
        <div className={cellClasses} onClick={day.tradeCount > 0 ? onClick : undefined}>
            <div className={`text-xs sm:text-sm font-semibold ${!day.isCurrentMonth ? 'text-gray-600' : 'text-white'}`}>
                {day.date.getDate()}
            </div>
            {day.tradeCount > 0 && day.isCurrentMonth && (
                <div className="text-right">
                    <p className={`text-calendar-profit font-bold ${profitColor}`}>{formatCurrency(day.profit)}</p>
                    <p className="text-calendar-trades text-gray-400">{tradeText}</p>
                </div>
            )}
        </div>
    );
};

const CalendarView: React.FC<CalendarViewProps> = ({ trades, onDayClick, currency }) => {
    const { t, language } = useLanguage();
    const [displayDate, setDisplayDate] = useState(new Date());

    const { calendarDays, weeklySummaries, monthlyProfit } = useMemo(() => generateCalendarData(trades, displayDate, language), [trades, displayDate, language]);

    const handlePrevMonth = () => setDisplayDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const handleNextMonth = () => setDisplayDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

    const formatCurrency = (value: number, options: Intl.NumberFormatOptions = {}) => {
        const symbol = currency === 'EUR' ? '€' : '$';
        const defaultOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
        const finalOptions = { ...defaultOptions, ...options };

        const formattedValue = new Intl.NumberFormat(language, {
            style: 'decimal',
            ...finalOptions
        }).format(value);
        
        return `${formattedValue}${symbol}`;
    };

    const formatDayProfit = (value: number) => {
        return formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    const weekDays = [t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat'), t('calendar.sun')];

    return (
        <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
            <div className="flex flex-col lg:flex-row lg:gap-8">
                <div className="flex-1 min-w-0">
                    <CalendarHeader displayDate={displayDate} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} />
                    
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
                        {weekDays.map(day => <div key={day}>{day}</div>)}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {calendarDays.map((day) => (
                            <CalendarDayCell key={day.date.toISOString()} day={day} onClick={() => onDayClick(day.date)} formatCurrency={formatDayProfit} />
                        ))}
                    </div>
                </div>

                <div className="mt-6 lg:mt-0 lg:w-56 lg:flex-shrink-0">
                    <h3 className="text-lg font-bold text-white mb-4 text-center lg:text-left">{t('calendar.weekly_summary')}</h3>
                    <div className="space-y-3">
                        {weeklySummaries.map((week) => (
                            <div key={week.weekLabel} className="bg-gray-800/50 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-white">{week.weekLabel}</p>
                                    <p className="text-xs text-gray-400">{week.tradingDays} {week.tradingDays === 1 ? t('calendar.day') : t('calendar.days')}</p>
                                </div>
                                <p className={`text-lg font-bold ${week.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(week.pnl)}
                                </p>
                            </div>
                        ))}
                         <div className="pt-3 border-t border-gray-700">
                             <div className="flex justify-between items-center">
                                 <p className="font-semibold text-white">{t('calendar.monthly_total')}</p>
                                 <p className={`text-xl font-bold ${monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                     {formatCurrency(monthlyProfit)}
                                 </p>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;