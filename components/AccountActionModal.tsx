
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

interface AccountActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddAccount: () => void;
    onUpdateAccount: () => void;
    onDeleteAccount: () => void;
    canUpdate: boolean;
    canDelete: boolean;
}

const AccountActionModal: React.FC<AccountActionModalProps> = ({ isOpen, onClose, onAddAccount, onUpdateAccount, onDeleteAccount, canUpdate, canDelete }) => {
    const { t } = useLanguage();
    useLockBodyScroll(isOpen);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={onClose}>
            <div 
                className="w-full max-w-sm p-6 sm:p-8 bg-[#16152c] border border-gray-700/50 rounded-3xl shadow-2xl animate-fade-in-scale-up" 
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white">{t('account_action_modal.title')}</h2>
                    <p className="text-gray-400 mt-2">{t('account_action_modal.subtitle')}</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={onAddAccount}
                        className="w-full flex items-center justify-center px-6 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-md transition-all duration-300 transform hover:scale-105"
                    >
                        {t('account_action_modal.add_new')}
                    </button>
                    <button
                        onClick={onUpdateAccount}
                        disabled={!canUpdate}
                        className="w-full flex items-center justify-center px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-2xl shadow-md transition-all duration-300 transform hover:scale-105 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none"
                    >
                         {t('account_action_modal.update_current')}
                    </button>
                    <button
                        onClick={onDeleteAccount}
                        disabled={!canDelete}
                        className="w-full flex items-center justify-center px-6 py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-2xl shadow-md transition-all duration-300 transform hover:scale-105 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none"
                    >
                         {t('account_action_modal.delete_current')}
                    </button>
                </div>

                <div className="text-center mt-8">
                     <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountActionModal;
