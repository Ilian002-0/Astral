
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import { Strategy } from '../types';

interface StrategyImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (strategies: Strategy[]) => void;
    availableStrategies: Strategy[];
    existingComments: string[];
}

const StrategyImportModal: React.FC<StrategyImportModalProps> = ({ isOpen, onClose, onImport, availableStrategies, existingComments }) => {
    const { t } = useLanguage();
    useLockBodyScroll(isOpen);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleImport = () => {
        const toImport = availableStrategies.filter(s => selectedIds.has(s.id));
        onImport(toImport);
        onClose();
        setSelectedIds(new Set());
    };

    const enhancedStrategies = useMemo(() => {
        const commentsSet = new Set(existingComments);
        return availableStrategies.map(s => ({
            ...s,
            isRecommended: s.criteria.comment ? commentsSet.has(s.criteria.comment) : false
        })).sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0)); // Show recommended first
    }, [availableStrategies, existingComments]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={onClose}>
            <div 
                className="w-full max-w-md p-6 bg-[#16152c] border border-gray-700/50 rounded-3xl shadow-2xl animate-fade-in-scale-up flex flex-col max-h-[80vh]" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">{t('strategy.import_modal_title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <p className="text-gray-400 text-sm mb-4">{t('strategy.import_modal_subtitle')}</p>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    {enhancedStrategies.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {t('strategy.no_cloud_strategies')}
                        </div>
                    ) : (
                        enhancedStrategies.map(strategy => {
                            const isSelected = selectedIds.has(strategy.id);
                            return (
                                <div 
                                    key={strategy.id}
                                    onClick={() => toggleSelection(strategy.id)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${isSelected ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'}`}
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-white truncate">{strategy.name}</h3>
                                            {strategy.isRecommended && (
                                                <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 text-[10px] uppercase font-bold tracking-wide">
                                                    {t('strategy.recommended_badge')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">
                                            {strategy.criteria.comment ? `Comment: ${strategy.criteria.comment}` : 'No filters'}
                                        </p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-500'}`}>
                                        {isSelected && (
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700">
                    <button
                        onClick={handleImport}
                        disabled={selectedIds.size === 0}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {t('strategy.import_selected')} ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StrategyImportModal;
