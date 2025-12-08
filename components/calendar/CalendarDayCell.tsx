
import React, { useMemo } from 'react';
import { CalendarDay } from '../../types';
import { getDayIdentifier } from '../../utils/calendar';

interface CalendarDayCellProps {
    day: CalendarDay;
    onClick: () => void;
    formatCurrency: (value: number) => string;
    index: number;
    isTransitioning: boolean;
    isCapturing: boolean;
    profitClass: string;
}

const CalendarDayCell: React.FC<CalendarDayCellProps> = ({ day, onClick, formatCurrency, index, isTransitioning, isCapturing, profitClass }) => {
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
        relative h-16 sm:h-20 flex flex-col justify-between p-2 rounded-2xl transition-all duration-300
        ${baseBg}
        ${tradeDayClasses}
        ${isToday ? '!bg-slate-800 border !border-slate-600' : ''}
        ${!day.isCurrentMonth ? 'text-gray-600' : ''}
        ${!isCapturing ? 'animate-fade-in' : ''}
    `;
    
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
                    <p className={`${profitClass} font-bold ${profitColor}`}>{formatCurrency(day.profit)}</p>
                    <p className="text-calendar-trades text-gray-400 flex items-center justify-end">
                        {day.tradeCount}
                        <TradeIcon />
                    </p>
                </div>
            )}
        </div>
    );
};

export default CalendarDayCell;
