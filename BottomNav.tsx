import React from 'react';
// FIX: Adjusted import paths to be relative to the root directory.
import { AppView } from './types';
import { useLanguage } from './contexts/LanguageContext';

// Icons
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const AccountsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;


interface BottomNavProps {
    onAddAccount: () => void;
    currentView: AppView;
    onNavigate: (view: AppView) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onAddAccount, currentView, onNavigate }) => {
    const { t } = useLanguage();
    return (
        <footer className="fixed bottom-0 left-0 right-0 z-10">
            <div className="max-w-4xl mx-auto">
                <div className="bg-[#16152c]/90 backdrop-blur-md border-t border-gray-700/50 flex justify-around items-center text-gray-400">
                    <button 
                      onClick={() => onNavigate('trades')}
                      className={`flex flex-col items-center justify-center p-3 transition-colors ${currentView === 'trades' ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-white'}`}>
                        <ListIcon />
                        <span className="text-xs mt-1">{t('nav.trades')}</span>
                    </button>
                    <button 
                        onClick={() => onNavigate('calendar')}
                        className={`flex flex-col items-center justify-center p-3 transition-colors ${currentView === 'calendar' ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-white'}`}>
                        <CalendarIcon />
                        <span className="text-xs mt-1">{t('nav.calendar')}</span>
                    </button>
                    <button onClick={onAddAccount} className="p-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full -mt-6 shadow-lg shadow-blue-500/30 transform hover:scale-110 transition-transform">
                        <PlusIcon />
                    </button>
                    <button 
                      onClick={() => onNavigate('dashboard')}
                      className={`flex flex-col items-center justify-center p-3 transition-colors ${currentView === 'dashboard' ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-white'}`}>
                        <DashboardIcon />
                        <span className="text-xs mt-1">{t('nav.dashboard')}</span>
                    </button>
                    <button 
                      onClick={() => onNavigate('profile')}
                      className={`flex flex-col items-center justify-center p-3 transition-colors ${currentView === 'profile' ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-white'}`}>
                        <AccountsIcon />
                        <span className="text-xs mt-1">{t('nav.profile')}</span>
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default BottomNav;
