
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

interface LoginRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: () => void;
}

const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({ isOpen, onClose, onLogin }) => {
    const { t } = useLanguage();
    useLockBodyScroll(isOpen);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={onClose}>
            <div 
                className="w-full max-w-sm p-6 bg-[#16152c] border border-gray-700/50 rounded-3xl shadow-2xl animate-fade-in-scale-up" 
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-6">
                    <div className="bg-cyan-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">{t('strategy.login_modal_title')}</h2>
                    <p className="text-gray-400 text-sm mt-3">{t('strategy.login_modal_message')}</p>
                </div>

                <div className="flex justify-center items-center gap-4 mt-6">
                    <button onClick={onClose} className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-2xl shadow-md transition-all duration-300">
                        {t('common.cancel')}
                    </button>
                    <button 
                        onClick={onLogin} 
                        className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-md transition-all duration-300"
                    >
                        {t('strategy.login_button')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginRequiredModal;
