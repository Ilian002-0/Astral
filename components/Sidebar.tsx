
import React from 'react';
import { AppView } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import Logo from './Logo';

// Icons
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const StrategyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
const GoalsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="7"></circle>
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
    </svg>
);
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;


interface SidebarProps {
    currentView: AppView;
    onNavigate: (view: AppView) => void;
    canInstall: boolean;
    onInstallClick: () => void;
}

const NavItem: React.FC<{
    view: AppView;
    currentView: AppView;
    onNavigate: (view: AppView) => void;
    icon: React.ReactNode;
    label: string;
}> = ({ view, currentView, onNavigate, icon, label }) => {
    const isActive = currentView === view;
    return (
        <button
            onClick={() => onNavigate(view)}
            className={`flex items-center w-full px-4 py-3 transition-all duration-200 rounded-2xl ${
                isActive 
                ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]' 
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
        >
            {icon}
            <span className="ml-4 font-medium">{label}</span>
        </button>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, canInstall, onInstallClick }) => {
    const { t } = useLanguage();

    return (
        <aside className="w-64 bg-[#16152c] p-4 flex-shrink-0 flex-col border-r border-gray-700/50 hidden md:flex">
            <div className="flex items-center justify-center mb-8 px-2 h-28">
                <Logo layout="desktop" />
            </div>
            <nav className="flex-grow space-y-2">
                <NavItem view="dashboard" currentView={currentView} onNavigate={onNavigate} icon={<DashboardIcon />} label={t('nav.dashboard')} />
                <NavItem view="trades" currentView={currentView} onNavigate={onNavigate} icon={<ListIcon />} label={t('nav.trades')} />
                <NavItem view="calendar" currentView={currentView} onNavigate={onNavigate} icon={<CalendarIcon />} label={t('nav.calendar')} />
                <NavItem view="goals" currentView={currentView} onNavigate={onNavigate} icon={<GoalsIcon />} label={t('nav.goals')} />
                <NavItem view="strategy" currentView={currentView} onNavigate={onNavigate} icon={<StrategyIcon />} label={t('nav.strategy')} />
            </nav>
            
            {canInstall && (
                <div className="px-4 py-2 mt-4">
                    <button
                        onClick={onInstallClick}
                        className="flex items-center justify-center w-full px-4 py-3 text-cyan-400 bg-cyan-950/30 border border-cyan-900/50 hover:bg-cyan-900/50 rounded-2xl transition-all duration-200 shadow-sm"
                    >
                        <DownloadIcon />
                        <span className="ml-2 font-bold text-sm">Install App</span>
                    </button>
                </div>
            )}

            <div className="mt-auto text-center text-gray-500 text-xs pt-4 border-t border-gray-700/50">
                <p>{t('settings.title')}</p>
                <p>v1.0.0</p>
            </div>
        </aside>
    );
};

export default Sidebar;
