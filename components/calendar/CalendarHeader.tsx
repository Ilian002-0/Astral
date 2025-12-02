
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const SpinnerIcon = () => <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

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

export default CalendarHeader;
