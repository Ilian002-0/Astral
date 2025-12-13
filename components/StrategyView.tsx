
import React, { useState, useMemo, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Strategy, ProcessedData, Account } from '../types';
import AddStrategyModal from './AddStrategyModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import StrategyActionModal from './StrategyActionModal';
import StrategyImportModal from './StrategyImportModal';
import { triggerHaptic } from '../utils/haptics';

interface StrategyViewProps {
    processedData: ProcessedData | null;
    currency?: 'USD' | 'EUR';
    initialBalance: number;
    onLogout: () => void;
    strategies: Strategy[];
    onSaveStrategy: (strategyData: { name: string, criteria: any, id?: string }) => void;
    onDeleteStrategy: (id: string) => void;
    onStrategySelect: (strategy: Strategy) => void;
    currentAccount: Account | null;
    linkStrategyToAccount: (id: string) => void;
    unlinkStrategyFromAccount: (id: string) => void;
}

// Safe ID Generator
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Detailed SVG for Rank 1 (Gold)
const BadgeRank1 = () => {
    const gradientId = useMemo(() => "goldGradient-" + Math.random().toString(36).substr(2, 9), []);
    return (
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-8 h-8 animate-spring-up drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#FCD34D', stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: '#B45309', stopOpacity: 1}} />
                </linearGradient>
            </defs>
            <g fill={`url(#${gradientId})`}>
                <path d="M123.9,10.4c-1.2,0.3-4.1,1.6-6.5,2.8c-15.7,8.1-13.7,7.5-28.1,9.3c-6.8,0.9-10.1,2.1-13.1,4.8c-3.2,2.9-4.8,5.3-8.1,12.6c-1.6,3.5-3.6,7.4-4.4,8.6c-0.8,1.2-4.8,5.5-8.7,9.4c-8.5,8.4-9.7,10.2-10,16.1c-0.2,2.9,0.1,5.1,1.3,11c2,9.8,2,13.5,0,22.9c-1.3,5.9-1.5,7.9-1.3,11c0.4,6.2,1.3,7.7,10.7,17l8,7.9l4.5,9.3c4,8.2,4.9,9.6,7.4,12c2.2,2.2,3.5,3,5.8,3.8c3,1,4.3,1.2,14.8,2.6c6.5,0.9,9.4,2,16.9,6.2c7.9,4.5,11.5,5.7,16,5.4c4.4-0.3,7.1-1.3,14.3-5.5c7.9-4.5,10.2-5.3,19.1-6.5c8.7-1.1,10.9-1.5,13.7-2.7c5-2.2,7.6-5.6,12.1-15.7c3.5-7.7,5.9-11,12.2-16.6c11.1-9.8,12.4-13.7,9.6-27.9c-2-9.9-2-13.5,0-23.3c1.2-5.7,1.5-8.2,1.3-10.9c-0.3-5.9-1.5-7.6-10.8-16.8l-8-7.9l-4.4-9.2c-7-14.5-9.6-16.4-23.9-17.9c-5.9-0.6-11-1.6-13.6-2.8c-1.1-0.5-4.5-2.4-7.7-4.2c-3.2-1.8-6.9-3.7-8.3-4.2C131.4,10,126.7,9.7,123.9,10.4z M138.3,37.9c11.9,1.9,23,7.7,32.1,16.8c17.6,17.6,22.4,44.9,11.8,67.1c-5.6,11.6-13.5,20.3-24.2,26.6c-19.3,11.2-43.4,10.7-62.1-1.3c-13.5-8.6-23-22.4-26.4-38.2c-1.2-5.3-1.4-15.9-0.5-21.4c4.5-27.4,26.4-47.9,53.9-50.4C127.6,36.7,132.8,36.9,138.3,37.9z"/>
                <path d="M111,60.4c-8.7,3.8-11.7,5.4-11.7,6c0,1,3.2,15.7,3.5,16.1c0.1,0.1,3.7-1.3,7.9-3.2c4.3-1.9,7.9-3.5,8.1-3.6c0.2-0.1,0.4,13.8,0.4,31.1V138h11.1h11.1V96.6V55.2l-9.3,0h-9.4L111,60.4z"/>
                <path d="M71.2,199.7c-5.6,15.6-10.1,28.4-10,28.5c0.2,0.1,7.3-2.3,15.8-5.2c8.5-2.9,15.7-5.3,16-5.3c0.3,0,4.4,6.5,9.3,14.4c4.8,7.9,8.9,14.2,9.1,14c0.4-0.4,22.2-60.6,22.2-61.2c0-0.2-0.7-0.2-1.5,0c-5.4,1.5-12.6-0.5-21.9-6.1c-6.4-3.9-8.2-4.5-14.8-5.3c-6.2-0.7-11.3-1.5-13-1.9C81.6,171.3,80.5,173.9,71.2,199.7z"/>
                <path d="M167.3,172.6c-14.6,1.8-11.6,0.7-26.6,8.7l-4.2,2.2l-3.6,9.8c-1.9,5.4-3.6,10.2-3.6,10.6c0,0.9,14.6,41.5,15.2,42.1c0.2,0.2,4.3-6.1,9.1-14c4.8-7.9,9-14.4,9.3-14.4s7.5,2.4,16,5.3c8.5,2.9,15.6,5.3,15.8,5.2c0.1,0-3.4-10.4-8-23c-13.2-36.4-11.9-33.3-13.1-33.3C173.1,171.9,170.2,172.2,167.3,172.6z"/>
            </g>
        </svg>
    );
};

// Detailed SVG for Rank 2 (Silver)
const BadgeRank2 = () => {
    const gradientId = useMemo(() => "silverGradient-" + Math.random().toString(36).substr(2, 9), []);
    return (
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-8 h-8 animate-spring-up drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#F3F4F6', stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: '#9CA3AF', stopOpacity: 1}} />
                </linearGradient>
            </defs>
            <g fill={`url(#${gradientId})`}>
                <path d="M123.9,10.4c-1.2,0.3-4.1,1.6-6.5,2.8c-15.7,8.1-13.7,7.5-28.1,9.3c-6.8,0.9-10.1,2.1-13.1,4.8c-3.2,2.9-4.8,5.3-8.1,12.6c-1.6,3.5-3.6,7.4-4.4,8.6c-0.8,1.2-4.8,5.5-8.7,9.4c-8.5,8.4-9.7,10.2-10,16.1c-0.2,2.9,0.1,5.1,1.3,11c2,9.8,2,13.5,0,22.9c-1.3,5.9-1.5,7.9-1.3,11c0.4,6.2,1.3,7.7,10.7,17l8,7.9l4.5,9.3c4,8.2,4.9,9.6,7.4,12c2.2,2.2,3.5,3,5.8,3.8c3,1,4.3,1.2,14.8,2.6c6.5,0.9,9.4,2,16.9,6.2c7.9,4.5,11.5,5.7,16,5.4c4.4-0.3,7.1-1.3,14.3-5.5c7.9-4.5,10.2-5.3,19.1-6.5c8.7-1.1,10.9-1.5,13.7-2.7c5-2.2,7.6-5.6,12.1-15.7c3.5-7.7,5.9-11,12.2-16.6c11.1-9.8,12.4-13.7,9.6-27.9c-2-9.9-2-13.5,0-23.3c1.2-5.7,1.5-8.2,1.3-10.9c-0.3-5.9-1.5-7.6-10.8-16.8l-8-7.9l-4.4-9.2c-7-14.5-9.6-16.4-23.9-17.9c-5.9-0.6-11-1.6-13.6-2.8c-1.1-0.5-4.5-2.4-7.7-4.2c-3.2-1.8-6.9-3.7-8.3-4.2C131.4,10,126.7,9.7,123.9,10.4z M138.3,37.9c11.9,1.9,23,7.7,32.1,16.8c17.6,17.6,22.4,44.9,11.8,67.1c-5.6,11.6-13.5,20.3-24.2,26.6c-19.3,11.2-43.4,10.7-62.1-1.3c-13.5-8.6-23-22.4-26.4-38.2c-1.2-5.3-1.4-15.9-0.5-21.4c4.5-27.4,26.4-47.9,53.9-50.4C127.6,36.7,132.8,36.9,138.3,37.9z"/>
                <path d="M118,53.5c-1.8,0.3-4.8,1.1-6.6,1.6c-3.5,1.1-11.2,4.8-12.2,5.9c-0.5,0.6,0.6,3.8,5.4,16c0.3,0.6,0.7,0.5,3.1-1c5.9-3.8,12.8-5.6,18.1-4.6c3.6,0.6,5,1.3,6.8,3.4c4.2,4.7,3,11.2-3.5,19.3c-3.4,4.3-10.2,10.8-22,21L98,123l0.1,6.9l0.1,6.9h30.5h30.5l0.1-9.3l0.1-9.4L145,118l-14.5-0.1l5.6-4.4c12-9.6,18.5-17.9,20.9-26.8c0.9-3.6,1.1-10.3,0.2-13.8c-2.2-9.3-9.1-16-19.3-18.8C134.2,52.9,122.4,52.7,118,53.5z"/>
                <path d="M71.2,199.7c-5.6,15.6-10.1,28.4-10,28.5c0.2,0.1,7.3-2.3,15.8-5.2c8.5-2.9,15.7-5.3,16-5.3c0.3,0,4.4,6.5,9.3,14.4c4.8,7.9,8.9,14.2,9.1,14c0.4-0.4,22.2-60.6,22.2-61.2c0-0.2-0.7-0.2-1.5,0c-5.4,1.5-12.6-0.5-21.9-6.1c-6.4-3.9-8.2-4.5-14.8-5.3c-6.2-0.7-11.3-1.5-13-1.9C81.6,171.3,80.5,173.9,71.2,199.7z"/>
                <path d="M167.3,172.6c-14.6,1.8-11.6,0.7-26.6,8.7l-4.2,2.2l-3.6,9.8c-1.9,5.4-3.6,10.2-3.6,10.6c0,0.9,14.6,41.5,15.2,42.1c0.2,0.2,4.3-6.1,9.1-14c4.8-7.9,9-14.4,9.3-14.4s7.5,2.4,16,5.3c8.5,2.9,15.6,5.3,15.8,5.2c0.2-0.1-6.7-19.5-18.2-51.1c-1.7-4.5-2-5.2-2.9-5.1C173.1,171.9,170.2,172.2,167.3,172.6z"/>
            </g>
        </svg>
    );
};

// Detailed SVG for Rank 3 (Bronze)
const BadgeRank3 = () => {
    const gradientId = useMemo(() => "bronzeGradient-" + Math.random().toString(36).substr(2, 9), []);
    return (
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-8 h-8 animate-spring-up drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#FDBA74', stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: '#9A3412', stopOpacity: 1}} />
                </linearGradient>
            </defs>
            <g fill={`url(#${gradientId})`}>
                <path d="M123.9,10.4c-1.2,0.3-4.1,1.6-6.5,2.8c-15.7,8.1-13.7,7.5-28.1,9.3c-6.8,0.9-10.1,2.1-13.1,4.8c-3.2,2.9-4.8,5.3-8.1,12.6c-1.6,3.5-3.6,7.4-4.4,8.6c-0.8,1.2-4.8,5.5-8.7,9.4c-8.5,8.4-9.7,10.2-10,16.1c-0.2,2.9,0.1,5.1,1.3,11c2,9.8,2,13.5,0,22.9c-1.3,5.9-1.5,7.9-1.3,11c0.4,6.2,1.3,7.7,10.7,17l8,7.9l4.5,9.3c4,8.2,4.9,9.6,7.4,12c2.2,2.2,3.5,3,5.8,3.8c3,1,4.3,1.2,14.8,2.6c6.5,0.9,9.4,2,16.9,6.2c7.9,4.5,11.5,5.7,16,5.4c4.4-0.3,7.1-1.3,14.3-5.5c7.9-4.5,10.2-5.3,19.1-6.5c8.7-1.1,10.9-1.5,13.7-2.7c5-2.2,7.6-5.6,12.1-15.7c3.5-7.7,5.9-11,12.2-16.6c11.1-9.8,12.4-13.7,9.6-27.9c-2-9.9-2-13.5,0-23.3c1.2-5.7,1.5-8.2,1.3-10.9c-0.3-5.9-1.5-7.6-10.8-16.8l-8-7.9l-4.4-9.2c-7-14.5-9.6-16.4-23.9-17.9c-5.9-0.6-11-1.6-13.6-2.8c-1.1-0.5-4.5-2.4-7.7-4.2c-3.2-1.8-6.9-3.7-8.3-4.2C131.4,10,126.7,9.7,123.9,10.4z M138.3,37.9c11.9,1.9,23,7.7,32.1,16.8c17.6,17.6,22.4,44.9,11.8,67.1c-5.6,11.6-13.5,20.3-24.2,26.6c-19.3,11.2-43.4,10.7-62.1-1.3c-13.5-8.6-23-22.4-26.4-38.2c-1.2-5.3-1.4-15.9-0.5-21.4c4.5-27.4,26.4-47.9,53.9-50.4C127.6,36.7,132.8,36.9,138.3,37.9z"/>
                <path d="M119.9,52.4c-7.5,0.9-18.5,4.3-19.1,5.8c-0.2,0.5,3.3,15.3,3.7,16.2c0,0,1.9-0.6,4-1.5c9.8-3.9,18.8-4,22.8-0.3c3.6,3.3,2.7,7.5-2.2,10c-2.6,1.3-3,1.4-9.8,1.5l-7.1,0.2v8.2v8.2l7.3,0.2c8,0.2,10.3,0.8,13.2,3.5c3.9,3.7,3.4,9.8-1,12.6c-5.3,3.4-16.2,2.8-26.4-1.3c-1.6-0.6-3.1-1.1-3.1-1c-0.1,0.1-1,3.6-2.1,7.8c-1,4.2-2,8-2.1,8.4c-0.1,0.6,0.6,1.1,3,2.2c6.9,3.1,15.6,4.5,25.3,4.1c11.6-0.5,20.2-3.6,26.2-9.6c12-11.9,7.3-30.7-8.7-34.9l-2.2-0.6l3.2-1.6c4.4-2.2,8.5-6.1,10.2-9.8c1.2-2.6,1.3-3.4,1.3-7.8c0-4.6-0.1-5.1-1.5-8c-2.8-5.8-8.5-9.9-16.5-11.9C134,52.2,125.4,51.7,119.9,52.4z"/>
                <path d="M71.2,199.7c-5.6,15.6-10.1,28.4-10,28.5c0.2,0.1,7.3-2.3,15.8-5.2c8.5-2.9,15.7-5.3,16-5.3c0.3,0,4.4,6.5,9.3,14.4c4.8,7.9,8.9,14.2,9.1,14c0.4-0.4,22.2-60.6,22.2-61.2c0-0.2-0.7-0.2-1.5,0c-5.4,1.5-12.6-0.5-21.9-6.1c-6.4-3.9-8.2-4.5-14.8-5.3c-6.2-0.7-11.3-1.5-13-1.9C81.6,171.3,80.5,173.9,71.2,199.7z"/>
                <path d="M167.3,172.6c-14.6,1.8-11.6,0.7-26.6,8.7l-4.2,2.2l-3.6,9.8c-1.9,5.4-3.6,10.2-3.6,10.6c0,0.9,14.6,41.5,15.2,42.1c0.2,0.2,4.3-6.1,9.1-14c4.8-7.9,9-14.4,9.3-14.4s7.5,2.4,16,5.3c8.5,2.9,15.6,5.3,15.8,5.2c0.1,0-3.4-10.4-8-23c-13.2-36.4-11.9-33.3-13.1-33.3C173.1,171.9,170.2,172.2,167.3,172.6z"/>
            </g>
        </svg>
    );
};

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank > 3) return null;

    if (rank === 1) return <BadgeRank1 />;
    if (rank === 2) return <BadgeRank2 />;
    if (rank === 3) return <BadgeRank3 />;

    return null;
};

const StrategyCard: React.FC<{
    strategy: Strategy;
    totalProfit: number;
    tradeCount: number;
    onClick: () => void;
    onMenuClick: (rect: DOMRect) => void;
    currency: 'USD' | 'EUR';
    rank: number;
}> = ({ strategy, totalProfit, tradeCount, onClick, onMenuClick, currency, rank }) => {
    const { language } = useLanguage();
    const timerRef = useRef<number | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = () => {
        timerRef.current = window.setTimeout(() => {
            triggerHaptic('medium');
            if (cardRef.current) {
                onMenuClick(cardRef.current.getBoundingClientRect());
            }
        }, 500);
    };

    const handleTouchEnd = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const handleClick = () => {
        onClick();
    };

    const formatCurrency = (value: number) => {
        const symbol = currency === 'USD' ? '$' : '€';
        const sign = value >= 0 ? '+' : '-';
        const numberPart = new Intl.NumberFormat(language, {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(value));

        if (language === 'fr') {
            return `${sign}${numberPart}${symbol}`;
        }
        return `${sign}${symbol}${numberPart}`;
    };

    const profitColor = totalProfit >= 0 ? 'text-green-400' : 'text-red-400';

    return (
        <div
            ref={cardRef}
            className="bg-[#16152c] p-5 rounded-3xl border border-gray-700/50 shadow-lg relative overflow-hidden group animate-spring-up transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:border-cyan-500/30 cursor-pointer"
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="bg-cyan-900/30 p-2 rounded-xl text-cyan-400 transition-transform duration-300 group-hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                
                <button 
                    className="p-2 -mr-2 -mt-2 text-gray-500 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (timerRef.current) clearTimeout(timerRef.current);
                        onMenuClick(e.currentTarget.getBoundingClientRect());
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                </button>
            </div>
            
            <div className="flex items-center mb-1 pr-6 gap-2">
                <h3 className="text-lg font-bold text-white truncate max-w-[70%]">{strategy.name}</h3>
                <RankBadge rank={rank} />
            </div>
            
            <div className="flex items-center text-xs text-gray-400 mb-4">
                <span className="truncate">
                    {strategy.criteria?.comment ? `Comment: ${strategy.criteria.comment}` : 'Magic: N/A'}
                </span>
            </div>

            <div className="border-t border-gray-700/50 pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Net Profit</p>
                <p className={`text-xl font-bold ${profitColor}`}>{formatCurrency(totalProfit)}</p>
            </div>
        </div>
    );
};

const StrategyView: React.FC<StrategyViewProps> = ({ processedData, currency = 'USD', initialBalance, onLogout, strategies, onSaveStrategy, onDeleteStrategy, onStrategySelect, currentAccount, linkStrategyToAccount, unlinkStrategyFromAccount }) => {
    const { t } = useLanguage();
    
    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    
    const [activeStrategyForAction, setActiveStrategyForAction] = useState<Strategy | null>(null);
    const [actionMenuOrigin, setActionMenuOrigin] = useState<DOMRect | null>(null);

    const [strategyToEdit, setStrategyToEdit] = useState<Strategy | null>(null);
    const [strategyToDelete, setStrategyToDelete] = useState<Strategy | null>(null);
    const [strategyToUnlink, setStrategyToUnlink] = useState<Strategy | null>(null);

    // Filter closed trades once
    const allTrades = useMemo(() => processedData?.closedTrades || [], [processedData]);

    // Extract unique comments for the Add Modal & Recommendations
    const uniqueComments = useMemo(() => {
        const comments = new Set<string>();
        allTrades.forEach(t => {
            if (t.comment) comments.add(t.comment);
        });
        return Array.from(comments);
    }, [allTrades]);

    // Compute stats AND Sort by Profit Descending
    const sortedStrategies = useMemo(() => {
        if (!currentAccount) return []; 
        // Explicitly handle potentially undefined activeStrategyIds using optional chaining and defaulting
        const activeIds = currentAccount?.activeStrategyIds ?? [];
        const activeSet = new Set(activeIds);
        
        const visibleStrategies = strategies.filter(s => activeSet.has(s.id));

        const withStats = visibleStrategies.map(s => {
            let filtered = [];
            // Safe check for criteria and comment. Ensure criteria object exists!
            if (s.criteria && s.criteria.comment) {
                filtered = allTrades.filter(t => t.comment === s.criteria.comment);
            }
            const totalProfit = filtered.reduce((sum, t) => sum + t.profit + t.commission + t.swap, 0);
            return { 
                strategy: s, 
                totalProfit, 
                tradeCount: filtered.length, 
                filteredTrades: filtered 
            };
        });

        // Sort: High Profit -> Low Profit. 
        return withStats.sort((a, b) => b.totalProfit - a.totalProfit);
    }, [strategies, currentAccount, allTrades]);

    // Available for import: Global list minus active ones
    const availableForImport = useMemo(() => {
        const activeIds = new Set(currentAccount?.activeStrategyIds || []);
        return strategies.filter(s => !activeIds.has(s.id));
    }, [strategies, currentAccount]);

    const handleSaveStrategy = (strategyData: { name: string, criteria: any, id?: string }) => {
        // Generate ID once if it doesn't exist, safely
        const id = strategyData.id || generateId();
        const finalStrategy = { ...strategyData, id };

        // 1. Save to Global Strategy Manager (Updates Firestore / Local)
        onSaveStrategy(finalStrategy);
        
        // 2. Link to CURRENT account immediately
        linkStrategyToAccount(id);

        setIsFormModalOpen(false);
        setStrategyToEdit(null);
        triggerHaptic('success');
    };

    const handleMenuOpen = (strategy: Strategy, origin: DOMRect) => {
        setActiveStrategyForAction(strategy);
        setActionMenuOrigin(origin);
        setIsActionModalOpen(true);
        triggerHaptic('light');
    };

    const handleEditAction = () => {
        if (activeStrategyForAction) {
            setStrategyToEdit(activeStrategyForAction);
            setTimeout(() => setIsFormModalOpen(true), 100);
        }
    };

    const handleUnlinkAction = () => {
        if (activeStrategyForAction) {
            setStrategyToUnlink(activeStrategyForAction);
            unlinkStrategyFromAccount(activeStrategyForAction.id);
            setActiveStrategyForAction(null);
        }
    };

    const handleDeleteAction = () => {
        if (activeStrategyForAction) {
            setStrategyToDelete(activeStrategyForAction);
        }
    };

    const handleConfirmDelete = () => {
        if (strategyToDelete) {
            // Check if we just want to remove it from view or delete globally.
            // Current UX suggests removing from view (unlinking) is safer unless explicit global management is added.
            // However, the prompt implies "deleting" the strategy itself.
            // Let's assume the delete button here means "Remove from view" for safety in this context,
            // OR we provide a distinct "Unlink" option.
            
            // Actually, let's make the trash icon perform the UNLINK action for this specific view,
            // as global deletion might affect other accounts.
            // But usually the trash icon implies destruction.
            // Let's execute Global Delete for now based on previous logic, but strictly speaking,
            // users might want to just Unlink.
            
            // Decision: The delete button in the menu calls onDeleteStrategy (Global).
            // Users should probably "Unlink" if they just want to hide it.
            // Let's assume the user knows what "Delete" means (Global).
            onDeleteStrategy(strategyToDelete.id);
            setStrategyToDelete(null);
            triggerHaptic('heavy');
        }
    };

    const handleImportStrategies = (imported: Strategy[]) => {
        imported.forEach(s => {
            linkStrategyToAccount(s.id);
        });
        triggerHaptic('success');
    };

    return (
        <div className="h-full flex flex-col pb-24 md:pb-0">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white">{t('strategy.title')}</h2>
                <div className="flex gap-2">
                    {/* Import Button */}
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 text-cyan-400 rounded-2xl shadow-md transition-all"
                        title={t('strategy.import_button')}
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </button>

                    <button 
                        onClick={() => {
                            setStrategyToEdit(null);
                            setIsFormModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-lg transition-transform transform hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        <span className="hidden sm:inline">{t('strategy.add_strategy')}</span>
                        <span className="sm:hidden">{t('common.add')}</span>
                    </button>
                </div>
            </div>

            {sortedStrategies.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#16152c] rounded-3xl border border-gray-700/50 border-dashed">
                    <div className="bg-gray-800/50 p-6 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    </div>
                    <p className="text-gray-400 max-w-xs">{t('strategy.no_strategies')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedStrategies.map((item, index) => {
                        return (
                            <StrategyCard
                                key={item.strategy.id}
                                strategy={item.strategy}
                                totalProfit={item.totalProfit}
                                tradeCount={item.tradeCount}
                                onClick={() => onStrategySelect(item.strategy)}
                                onMenuClick={(rect) => handleMenuOpen(item.strategy, rect)}
                                currency={currency}
                                rank={index + 1}
                            />
                        );
                    })}
                </div>
            )}

            <AddStrategyModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setStrategyToEdit(null);
                }}
                onSave={handleSaveStrategy}
                existingComments={uniqueComments}
                strategyToEdit={strategyToEdit}
            />

            <StrategyImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportStrategies}
                availableStrategies={availableForImport}
                existingComments={uniqueComments}
            />

            <StrategyActionModal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                onEdit={handleEditAction}
                onDelete={handleUnlinkAction} // CHANGED: The trash icon in the menu now unlinks from the view instead of deleting globally
                strategyName={activeStrategyForAction?.name || ''}
                originRect={actionMenuOrigin}
            />
            
            <DeleteConfirmationModal
                isOpen={!!strategyToDelete}
                onClose={() => setStrategyToDelete(null)}
                onConfirm={handleConfirmDelete}
                accountName={strategyToDelete ? strategyToDelete.name : ''}
            />
        </div>
    );
};

export default StrategyView;
