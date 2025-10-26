import React from 'react';
import { AppView } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// Icons
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const AccountsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
const GoalsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="7"></circle>
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
    </svg>
);

interface BottomNavProps {
    currentView: AppView;
    onNavigate: (view: AppView) => void;
}

const NavButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    label: string;
    children: React.ReactNode;
}> = ({ isActive, onClick, label, children }) => {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-2 transition-colors w-1/5 ${isActive ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-white'}`}>
            {children}
            <span className="text-xs mt-1 text-center">{label}</span>
        </button>
    );
};

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
    const { t } = useLanguage();
    return (
        <footer className="fixed bottom-0 left-0 right-0 z-10">
            <div className="max-w-4xl mx-auto">
                <div className="bg-[#16152c]/90 backdrop-blur-md border-t border-gray-700/50 flex justify-around items-center text-gray-400">
                    <NavButton isActive={currentView === 'dashboard'} onClick={() => onNavigate('dashboard')} label={t('nav.dashboard')}>
                        <DashboardIcon />
                    </NavButton>
                    <NavButton isActive={currentView === 'trades'} onClick={() => onNavigate('trades')} label={t('nav.trades_short')}>
                        <ListIcon />
                    </NavButton>
                    <NavButton isActive={currentView === 'calendar'} onClick={() => onNavigate('calendar')} label={t('nav.calendar')}>
                        <CalendarIcon />
                    </NavButton>
                    <NavButton isActive={currentView === 'goals'} onClick={() => onNavigate('goals')} label={t('nav.goals')}>
                        <GoalsIcon />
                    </NavButton>
                    <NavButton isActive={currentView === 'profile'} onClick={() => onNavigate('profile')} label={t('nav.profile')}>
                        <AccountsIcon />
                    </NavButton>
                </div>
            </div>
        </footer>
    );
};

export default BottomNav;