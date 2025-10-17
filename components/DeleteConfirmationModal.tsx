import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    accountName: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, accountName }) => {
    const { t } = useLanguage();
    useLockBodyScroll(isOpen);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50" onClick={onClose}>
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] sm:w-full max-w-md p-6 sm:p-8 bg-[#16152c] border border-red-700/50 rounded-2xl shadow-2xl animate-fade-in" 
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white">{t('delete_confirmation.title')}</h2>
                    <p className="text-gray-400 mt-4">{t('delete_confirmation.message', { accountName })}</p>
                </div>

                <div className="flex justify-center items-center space-x-4 mt-8">
                    <button onClick={onClose} className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105">{t('common.cancel')}</button>
                    <button 
                        onClick={onConfirm} 
                        className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105"
                    >
                        {t('delete_confirmation.confirm_button')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;