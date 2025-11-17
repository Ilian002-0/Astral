import React from 'react';
import { AppView } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// Icons
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const AccountsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
const AnalysisIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>;
const GoalsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="7"></circle>
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
    </svg>
);


interface SidebarProps {
    currentView: AppView;
    onNavigate: (view: AppView) => void;
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
            className={`flex items-center w-full px-4 py-3 transition-colors duration-200 rounded-lg ${
                isActive 
                ? 'bg-cyan-500 text-white shadow-lg' 
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
        >
            {icon}
            <span className="ml-4 font-medium">{label}</span>
        </button>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
    const { t } = useLanguage();

    return (
        <aside className="w-64 bg-[#16152c] p-4 flex-shrink-0 flex-col border-r border-gray-700/50 hidden md:flex">
            <div className="flex items-center justify-center mb-8 px-2 h-28">
                <div className="flex items-center justify-center text-center flex-col h-full">
                    <img src="/logo.svg" alt="Atlas Logo" className="w-auto object-contain max-h-20" />
                    <span className="mt-0 text-xl font-bold tracking-[5px] text-[#8B9BBD]">ATLAS</span>
                </div>
            </div>
            <nav className="flex-grow space-y-2">
                <NavItem view="dashboard" currentView={currentView} onNavigate={onNavigate} icon={<DashboardIcon />} label={t('nav.dashboard')} />
                <NavItem view="trades" currentView={currentView} onNavigate={onNavigate} icon={<ListIcon />} label={t('nav.trades')} />
                <NavItem view="calendar" currentView={currentView} onNavigate={onNavigate} icon={<CalendarIcon />} label={t('nav.calendar')} />
                <NavItem view="goals" currentView={currentView} onNavigate={onNavigate} icon={<GoalsIcon />} label={t('nav.goals')} />
                <NavItem view="profile" currentView={currentView} onNavigate={onNavigate} icon={<AccountsIcon />} label={t('nav.profile')} />
            </nav>
            <div className="mt-auto text-center text-gray-500 text-xs pt-4 border-t border-gray-700/50">
                <p>{t('profile.free_to_use')}</p>
                <p>{t('profile.data_privacy')}</p>
            </div>
        </aside>
    );
};

export default Sidebar;