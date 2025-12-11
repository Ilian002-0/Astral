
import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import { Strategy } from '../types';

interface AddStrategyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (strategy: { name: string, criteria: any, id?: string }) => void;
    existingComments: string[];
    strategyToEdit?: Strategy | null;
}

const AddStrategyModal: React.FC<AddStrategyModalProps> = ({ isOpen, onClose, onSave, existingComments, strategyToEdit }) => {
    const { t } = useLanguage();
    useLockBodyScroll(isOpen);

    const [name, setName] = useState('');
    const [filterType, setFilterType] = useState<'comment' | 'magic'>('comment');
    const [selectedComment, setSelectedComment] = useState('');
    
    // Sort comments alphabetically
    const sortedComments = useMemo(() => [...existingComments].sort(), [existingComments]);

    useEffect(() => {
        if (isOpen) {
            if (strategyToEdit) {
                setName(strategyToEdit.name);
                if (strategyToEdit.criteria.comment) {
                    setFilterType('comment');
                    setSelectedComment(strategyToEdit.criteria.comment);
                } else if (strategyToEdit.criteria.magicNumber) {
                    setFilterType('magic');
                    // Add magic number logic here when available
                }
            } else {
                resetForm();
            }
        }
    }, [isOpen, strategyToEdit]);

    const handleSave = () => {
        if (!name.trim()) return;
        
        onSave({
            id: strategyToEdit?.id,
            name: name.trim(),
            criteria: {
                comment: filterType === 'comment' ? selectedComment : undefined,
                // magicNumber logic would go here later
            }
        });
        if (!strategyToEdit) resetForm();
    };

    const resetForm = () => {
        setName('');
        setFilterType('comment');
        setSelectedComment('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    const isEditMode = !!strategyToEdit;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={handleClose}>
            <div 
                className="w-full max-w-sm p-6 bg-[#16152c] border border-gray-700/50 rounded-3xl shadow-2xl animate-fade-in-scale-up" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                    <h2 className="text-xl font-bold text-white">{isEditMode ? t('strategy.modal_title_edit') : t('strategy.modal_title')}</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>

                <div className="space-y-6">
                    {/* Strategy Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('strategy.strategy_name')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('strategy.strategy_name_placeholder')}
                            className="w-full px-4 py-3 bg-[#0c0b1e] border border-gray-600 rounded-2xl text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
                        />
                    </div>

                    {/* Filter Type Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('strategy.filter_criteria')}</label>
                        <div className="flex bg-gray-800 rounded-2xl p-1">
                            <button
                                onClick={() => setFilterType('comment')}
                                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${filterType === 'comment' ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                            >
                                {t('strategy.comment')}
                            </button>
                            <button
                                onClick={() => setFilterType('magic')}
                                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${filterType === 'magic' ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                            >
                                {t('strategy.magic_number')}
                            </button>
                        </div>
                    </div>

                    {/* Conditional Input */}
                    {filterType === 'comment' ? (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('strategy.select_comment')}</label>
                            <select
                                value={selectedComment}
                                onChange={(e) => setSelectedComment(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0c0b1e] border border-gray-600 rounded-2xl text-white focus:ring-cyan-500 focus:border-cyan-500 transition appearance-none"
                            >
                                <option value="" disabled>{t('strategy.select_comment')}</option>
                                {sortedComments.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="animate-fade-in relative opacity-50 pointer-events-none">
                            <label className="block text-sm font-medium text-gray-500 mb-2">{t('strategy.magic_number')}</label>
                            <input
                                type="text"
                                disabled
                                placeholder={t('strategy.magic_number_placeholder')}
                                className="w-full px-4 py-3 bg-[#0c0b1e] border border-gray-700 rounded-2xl text-gray-500"
                            />
                            <div className="absolute top-0 right-0">
                                <span className="bg-gray-700 text-gray-300 text-[10px] px-2 py-1 rounded-full">{t('strategy.coming_soon_badge')}</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={!name.trim() || (filterType === 'comment' && !selectedComment)}
                        className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isEditMode ? t('strategy.update_strategy') : t('strategy.save_strategy')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddStrategyModal;
