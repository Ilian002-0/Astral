import React, { useState, useMemo } from 'react';
import { Trade, CalendarDay } from '../types';
import { generateCalendarData, getDayIdentifier } from '../utils/calendar';
import { useLanguage } from '../contexts/LanguageContext';
import useMediaQuery from '../hooks/useMediaQuery';

interface CalendarViewProps {
    trades: Trade[];
    onDayClick: (date: Date) => void;
    currency: 'USD' | 'EUR';
    transitioningDay: string | null;
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

interface CalendarDayCellProps {
    day: CalendarDay;
    onClick: () => void;
    formatCurrency: (value: number) => string;
    index: number;
    isTransitioning: boolean;
}

const CalendarDayCell: React.FC<CalendarDayCellProps> = ({ day, onClick, formatCurrency, index, isTransitioning }) => {
    const isToday = day.isToday && day.isCurrentMonth;
    const hasTrades = day.tradeCount > 0 && day.isCurrentMonth;

    const profitColor = day.profit > 0 ? 'text-green-400' : 'text-red-400';

    const tradeDayClasses = useMemo(() => {
        if (hasTrades) {
            if (day.profit > 0) {
                return 'bg-teal-950/70 border border-teal-800 cursor-pointer hover:bg-teal-900/80 hover:scale-105';
            }
            if (day.profit < 0) {
                return 'bg-red-950/70 border border-red-800 cursor-pointer hover:bg-red-900/80 hover:scale-105';
            }
            return 'border border-gray-600 cursor-pointer hover:bg-gray-700 hover:scale-105';
        }
        return '';
    }, [hasTrades, day.profit]);
    
    const baseBg = day.isCurrentMonth ? 'bg-gray-800/50' : 'bg-transparent';

    const cellClasses = `
        relative h-16 sm:h-20 flex flex-col justify-between p-2 rounded-lg transition-all duration-300
        ${baseBg}
        ${tradeDayClasses}
        ${isToday ? '!bg-slate-800 border !border-slate-600' : ''}
        ${!day.isCurrentMonth ? 'text-gray-600' : ''}
        animate-fade-in
    `;

    const formattedProfit = formatCurrency(day.profit);
    let profitClass = 'text-calendar-profit';

    if (formattedProfit.length > 7) {
        profitClass = 'text-calendar-profit-xs';
    } else if (formattedProfit.length > 4) {
        profitClass = 'text-calendar-profit-sm';
    }
    
    const TradeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
    );
    
    const transitionName = isTransitioning ? `day-card-active` : '';

    return (
        <div 
            className={cellClasses} 
            onClick={day.tradeCount > 0 ? onClick : undefined}
            style={{ 
                animationDelay: `${index * 15}ms`, 
                opacity: 0,
                // @ts-ignore
                viewTransitionName: transitionName
            }}
        >
            <div className={`text-xs sm:text-sm ${isToday ? 'font-bold' : 'font-semibold'} ${!day.isCurrentMonth ? 'text-gray-600' : 'text-white'}`}>
                {day.date.getDate()}
            </div>
            {hasTrades && (
                <div className="text-right">
                    <p className={`${profitClass} font-bold ${profitColor}`}>{formattedProfit}</p>
                    <p className="text-calendar-trades text-gray-400 flex items-center justify-end">
                        {day.tradeCount}
                        <TradeIcon />
                    </p>
                </div>
            )}
        </div>
    );
};

const CalendarView: React.FC<CalendarViewProps> = ({ trades, onDayClick, currency, transitioningDay }) => {
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
        
        if (language === 'fr') {
            return `${formattedValue}${symbol}`;
        }
        return `${symbol}${formattedValue}`;
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
                        {calendarDays.map((day, index) => (
                            <CalendarDayCell 
                                key={day.date.toISOString()} 
                                day={day} 
                                onClick={() => onDayClick(day.date)} 
                                formatCurrency={formatDayProfit}
                                index={index}
                                isTransitioning={getDayIdentifier(day.date) === transitioningDay}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-6 lg:mt-0 lg:w-56 lg:flex-shrink-0">
                    <h3 className="text-lg font-bold text-white mb-4 text-center lg:text-left">{t('calendar.weekly_summary')}</h3>
                    <div className="space-y-1 sm:space-y-2">
                        {weeklySummaries.map((week, index) => (
                            <div key={`${week.weekLabel}-${index}`} className="bg-gray-800/50 p-3 rounded-lg flex justify-between items-center h-16 sm:h-20">
                                <div>
                                    <p className="font-semibold text-white">{week.weekLabel}</p>
                                    <p className="text-xs text-gray-400">{week.tradingDays} {week.tradingDays === 1 ? t('calendar.day') : t('calendar.days')}</p>
                                </div>
                                <p className={`text-lg font-bold ${week.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(week.pnl)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
             <div className="pt-3 mt-4 border-t border-gray-700">
                 <div className="flex justify-between items-center">
                     <p className="font-semibold text-white">{t('calendar.monthly_total')}</p>
                     <p className={`text-xl font-bold ${monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                         {formatCurrency(monthlyProfit)}
                     </p>
                 </div>
             </div>
        </div>
    );
};

export default CalendarView;