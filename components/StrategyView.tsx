
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const StrategyView: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
            <div className="bg-gray-800/50 p-6 rounded-full mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t('nav.strategy')}</h2>
            <p className="text-gray-400">{t('strategy.coming_soon')}</p>
        </div>
    );
};
export default StrategyView;
