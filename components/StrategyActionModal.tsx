import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

interface StrategyActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    strategyName: string;
}

const StrategyActionModal: React.FC<StrategyActionModalProps> = ({ isOpen, onClose, onEdit, onDelete, strategyName }) => {
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
                    <h2 className="text-xl font-bold text-white">{strategyName}</h2>
                    <p className="text-gray-400 text-sm mt-1">{t('strategy.actions_subtitle')}</p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={onEdit}
                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-2xl transition-colors"
                    >
                        {t('strategy.edit_strategy')}
                    </button>
                    <button
                        onClick={onDelete}
                        className="w-full py-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 font-bold rounded-2xl transition-colors"
                    >
                        {t('strategy.delete_strategy')}
                    </button>
                </div>
                 <div className="text-center mt-6">
                     <button onClick={onClose} className="text-gray-500 hover:text-white text-sm">{t('common.cancel')}</button>
                 </div>
            </div>
        </div>
    );
};
export default StrategyActionModal;