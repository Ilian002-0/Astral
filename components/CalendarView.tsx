
import React, { useState, useMemo, useRef } from 'react';
import { Trade, CalendarDay, CalendarSettings, WeeklySummary } from '../types';
import { generateCalendarData, getDayIdentifier } from '../utils/calendar';
import { useLanguage } from '../contexts/LanguageContext';
import useMediaQuery from '../hooks/useMediaQuery';
import CalendarHeader from './calendar/CalendarHeader';
import CalendarDayCell from './calendar/CalendarDayCell';

interface CalendarViewProps {
    trades: Trade[];
    onDayClick: (date: Date) => void;
    currency: 'USD' | 'EUR';
    transitioningDay: string | null;
    calendarSettings: CalendarSettings;
}

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
                const html2canvas = (await import('html2canvas')).default;

                const canvas = await html2canvas(calendarRef.current, {
                    useCORS: true,
                    backgroundColor: '#0c0b1e',
                    scale: 2,
                });

                canvas.toBlob(async (blob: Blob | null) => {
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

    const consistentProfitClass = useMemo(() => {
        let maxProfitLength = 0;
        calendarDays.forEach(day => {
            if (day.isCurrentMonth && day.tradeCount > 0) {
                const formattedProfit = formatDayProfit(day.profit);
                if (formattedProfit.length > maxProfitLength) {
                    maxProfitLength = formattedProfit.length;
                }
            }
        });

        if (maxProfitLength > 7) {
            return 'text-calendar-profit-xs';
        }
        if (maxProfitLength > 4) {
            return 'text-calendar-profit-sm';
        }
        return 'text-calendar-profit';
    }, [calendarDays, currency, language]);

    if (hideWeekends) {
        const relevantWeeks = weeks.filter(week => week.some(day => day.isCurrentMonth));
        const relevantSummaries = weeklySummaries.filter((_, index) => weeks[index] && weeks[index].some(d => d.isCurrentMonth));

        return (
            <div ref={calendarRef} className="bg-[#16152c] p-4 sm:p-6 rounded-3xl shadow-lg border border-gray-700/50">
                <CalendarHeader displayDate={displayDate} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} onScreenshot={handleScreenshot} isCapturing={isCapturing} />
                
                <div className="grid grid-cols-[1fr_4.5rem] sm:grid-cols-[1fr_5rem] items-end border-b border-gray-700 pb-2 mb-2 gap-2 sm:gap-4">
                    <div className="grid grid-cols-5 gap-1 text-center text-xs text-gray-400">
                        {weekDayHeaders.map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className="text-center">
                         <h3 className="text-sm font-bold text-white">{t('calendar.weekly_summary')}</h3>
                    </div>
                </div>

                <div className="flex flex-col gap-1 sm:gap-2">
                    {relevantWeeks.map((week, index) => {
                        const summary = relevantSummaries[index];
                        if (!summary) return null;

                        return (
                             <div key={index} className="grid grid-cols-[1fr_4.5rem] sm:grid-cols-[1fr_5rem] items-stretch gap-2 sm:gap-4">
                                <div className="grid grid-cols-5 gap-1 sm:gap-2">
                                     {week.slice(0, 5).map((day, dayIndex) => (
                                        <CalendarDayCell 
                                            key={day.date.toISOString()} 
                                            day={day} 
                                            onClick={() => onDayClick(day.date)} 
                                            formatCurrency={formatDayProfit}
                                            index={index * 5 + dayIndex}
                                            isTransitioning={getDayIdentifier(day.date) === transitioningDay}
                                            isCapturing={isCapturing}
                                            profitClass={consistentProfitClass}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center">
                                     <div className="bg-gray-800/50 rounded-2xl flex flex-col justify-center items-center text-center w-full h-16 sm:h-20 p-2">
                                        <p className="font-semibold text-white text-xs">{summary.weekLabel}</p>
                                        <p className={`font-bold whitespace-nowrap ${summary.pnl >= 0 ? 'text-green-400' : 'text-red-400'} text-xs mt-1`}>
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
        <div ref={calendarRef} className="bg-[#16152c] p-4 sm:p-6 rounded-3xl shadow-lg border border-gray-700/50">
            <div className={`lg:grid lg:grid-cols-[1fr_12rem] lg:gap-8`}>
                <div className="min-w-0">
                    <CalendarHeader displayDate={displayDate} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} onScreenshot={handleScreenshot} isCapturing={isCapturing} />
                    <div className={`grid grid-cols-7 gap-1 text-center text-xs text-gray-400 pb-2 mb-2 border-b border-gray-700`}>
                        {weekDayHeaders.map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className={`grid grid-cols-7 gap-1 sm:gap-2`}>
                        {calendarDays.map((day, index) => (
                            <CalendarDayCell 
                                key={day.date.toISOString()} 
                                day={day} 
                                onClick={() => onDayClick(day.date)} 
                                formatCurrency={formatDayProfit} 
                                index={index} 
                                isTransitioning={getDayIdentifier(day.date) === transitioningDay} 
                                isCapturing={isCapturing}
                                profitClass={consistentProfitClass}
                            />
                        ))}
                    </div>
                </div>

                <div className={`mt-6 lg:mt-0`}>
                    <h3 className={`text-lg font-bold text-white mb-4 text-center lg:text-left`}>{t('calendar.weekly_summary')}</h3>
                    <div className="space-y-1 sm:space-y-2">
                        {weeklySummaries.filter(w => w.weekLabel.trim()).map((week, index) => (
                            <div key={`${week.weekLabel}-${index}`} className={`bg-gray-800/50 rounded-2xl flex justify-between items-center p-3 lg:h-20`}>
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
