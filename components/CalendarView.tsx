import React, { useState, useMemo, useRef } from 'react';
import { Trade, CalendarDay, CalendarSettings, WeeklySummary } from '../types';
import { generateCalendarData, getDayIdentifier } from '../utils/calendar';
import { useLanguage } from '../contexts/LanguageContext';
import useMediaQuery from '../hooks/useMediaQuery';

// @ts-ignore
declare const html2canvas: any;

const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const SpinnerIcon = () => <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;


interface CalendarViewProps {
    trades: Trade[];
    onDayClick: (date: Date) => void;
    currency: 'USD' | 'EUR';
    transitioningDay: string | null;
    calendarSettings: CalendarSettings;
}

interface CalendarHeaderProps {
    displayDate: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onScreenshot: () => void;
    isCapturing: boolean;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ displayDate, onPrevMonth, onNextMonth, onScreenshot, isCapturing }) => {
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
            <div className="flex items-center gap-2">
                <button onClick={onNextMonth} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                 <button
                    onClick={onScreenshot}
                    disabled={isCapturing}
                    className="p-2 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    title="Take Screenshot & Share"
                >
                    {isCapturing ? <SpinnerIcon /> : <CameraIcon />}
                </button>
            </div>
        </div>
    );
};

interface CalendarDayCellProps {
    day: CalendarDay;
    onClick: () => void;
    formatCurrency: (value: number) => string;
    index: number;
    isTransitioning: boolean;
    isCapturing: boolean;
}

const CalendarDayCell: React.FC<CalendarDayCellProps> = ({ day, onClick, formatCurrency, index, isTransitioning, isCapturing }) => {
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
        ${!isCapturing ? 'animate-fade-in' : ''}
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
                animationDelay: !isCapturing ? `${index * 15}ms` : '0s', 
                opacity: isCapturing ? 1 : 0,
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

const CalendarView: React.FC<CalendarViewProps> = ({ trades, onDayClick, currency, transitioningDay, calendarSettings }) => {
    const { t, language } = useLanguage();
    const [displayDate, setDisplayDate] = useState(new Date());
    const calendarRef = useRef<HTMLDivElement>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const { hideWeekends } = calendarSettings;

    const { calendarDays, weeklySummaries, monthlyProfit } = useMemo(() => generateCalendarData(trades, displayDate, language), [trades, displayDate, language]);

    const { weekDayHeaders, weeks } = useMemo(() => {
        const allWeekDays = [t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat'), t('calendar.sun')];
        
        const allWeeks: CalendarDay[][] = [];
        for (let i = 0; i < calendarDays.length; i += 7) {
            allWeeks.push(calendarDays.slice(i, i + 7));
        }

        if (hideWeekends) {
            return {
                weekDayHeaders: allWeekDays.slice(0, 5),
                weeks: allWeeks,
            };
        }
        return {
            weekDayHeaders: allWeekDays,
            weeks: allWeeks,
        };
    }, [calendarDays, hideWeekends, t]);

    const handlePrevMonth = () => setDisplayDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const handleNextMonth = () => setDisplayDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

    const handleScreenshot = () => {
        if (!calendarRef.current || isCapturing) return;

        setIsCapturing(true);

        setTimeout(async () => {
            try {
                if (!calendarRef.current) {
                    setIsCapturing(false);
                    return;
                }
                const canvas = await html2canvas(calendarRef.current, {
                    useCORS: true,
                    backgroundColor: '#0c0b1e',
                    scale: 2,
                });

                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        console.error("Could not create blob from canvas");
                        setIsCapturing(false);
                        return;
                    }
                    const file = new File([blob], 'atlas-calendar.png', { type: 'image/png' });
                    const shareData = {
                        files: [file],
                        title: t('common.share'),
                        text: 'My trading calendar from Atlas.'
                    };

                    try {
                        // @ts-ignore
                        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                            // @ts-ignore
                            await navigator.share(shareData);
                        } else {
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = 'atlas-calendar.png';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }
                    } catch (err) {
                        console.error("Share failed:", err);
                    } finally {
                        setIsCapturing(false);
                    }
                }, 'image/png');

            } catch (error) {
                console.error("Screenshot failed:", error);
                setIsCapturing(false);
            }
        }, 50);
    };


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

    if (hideWeekends) {
        const relevantWeeks = weeks.filter(week => week.some(day => day.isCurrentMonth));
        const relevantSummaries = weeklySummaries.filter((_, index) => weeks[index] && weeks[index].some(d => d.isCurrentMonth));

        return (
            <div ref={calendarRef} className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
                <CalendarHeader displayDate={displayDate} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} onScreenshot={handleScreenshot} isCapturing={isCapturing} />
                
                <div className="flex">
                    <div className="flex-1 grid grid-cols-5 gap-1 text-center text-xs text-gray-400 mb-2 border-r border-gray-700 pr-2">
                        {weekDayHeaders.map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className="w-24 flex-shrink-0 text-center mb-2 pl-2">
                         <h3 className="text-base font-bold text-white">{t('calendar.weekly_summary')}</h3>
                    </div>
                </div>

                <div className="flex flex-col gap-1 sm:gap-2">
                    {relevantWeeks.map((week, index) => {
                        const summary = relevantSummaries[index];
                        if (!summary) return null;

                        return (
                             <div key={index} className="flex items-stretch">
                                <div className="flex-1 grid grid-cols-5 gap-1 sm:gap-2 border-r border-gray-700 pr-2">
                                     {week.slice(0, 5).map((day, dayIndex) => (
                                        <CalendarDayCell 
                                            key={day.date.toISOString()} 
                                            day={day} 
                                            onClick={() => onDayClick(day.date)} 
                                            formatCurrency={formatDayProfit}
                                            index={index * 5 + dayIndex}
                                            isTransitioning={getDayIdentifier(day.date) === transitioningDay}
                                            isCapturing={isCapturing}
                                        />
                                    ))}
                                </div>
                                <div className="w-24 flex-shrink-0 flex items-center pl-2">
                                     <div className="bg-gray-800/50 rounded-lg flex flex-col justify-center items-center text-center w-full h-16 sm:h-20 p-2">
                                        <p className="font-semibold text-white text-sm">{summary.weekLabel}</p>
                                        <p className={`font-bold whitespace-nowrap ${summary.pnl >= 0 ? 'text-green-400' : 'text-red-400'} text-sm mt-1`}>
                                            {formatCurrency(summary.pnl)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
    }

    return (
        <div ref={calendarRef} className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
            <div className={`lg:flex lg:gap-8`}>
                <div className="flex-1 min-w-0">
                    <CalendarHeader displayDate={displayDate} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} onScreenshot={handleScreenshot} isCapturing={isCapturing} />
                    <div className={`grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2`}>
                        {weekDayHeaders.map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className={`grid grid-cols-7 gap-1 sm:gap-2`}>
                        {calendarDays.map((day, index) => (
                            <CalendarDayCell key={day.date.toISOString()} day={day} onClick={() => onDayClick(day.date)} formatCurrency={formatDayProfit} index={index} isTransitioning={getDayIdentifier(day.date) === transitioningDay} isCapturing={isCapturing} />
                        ))}
                    </div>
                </div>

                <div className={`lg:w-48 lg:flex-shrink-0 mt-6 lg:mt-0`}>
                    <h3 className={`text-lg font-bold text-white mb-4 text-center lg:text-left`}>{t('calendar.weekly_summary')}</h3>
                    <div className="space-y-1 sm:space-y-2">
                        {weeklySummaries.filter(w => w.weekLabel.trim()).map((week, index) => (
                            <div key={`${week.weekLabel}-${index}`} className={`bg-gray-800/50 rounded-lg flex justify-between items-center p-3`}>
                                <p className={`font-semibold text-white text-sm`}>{week.weekLabel}</p>
                                <p className={`font-bold whitespace-nowrap ${week.pnl >= 0 ? 'text-green-400' : 'text-red-400'} text-base`}>
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