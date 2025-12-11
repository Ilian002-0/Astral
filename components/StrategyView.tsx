
import React, { useState, useMemo, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Trade, Strategy, ProcessedData } from '../types';
import AddStrategyModal from './AddStrategyModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import StrategyActionModal from './StrategyActionModal';
import StrategyImportModal from './StrategyImportModal';
import LoginRequiredModal from './LoginRequiredModal';
import { triggerHaptic } from '../utils/haptics';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface StrategyViewProps {
    processedData: ProcessedData | null;
    currency?: 'USD' | 'EUR';
    initialBalance: number;
    onLogout: () => void;
    strategies: Strategy[];
    onSaveStrategy: (strategyData: { name: string, criteria: any, id?: string }) => void;
    onDeleteStrategy: (id: string) => void;
    onStrategySelect: (strategy: Strategy) => void; // New Prop for navigation
}

const StrategyCard: React.FC<{
    strategy: Strategy;
    totalProfit: number;
    tradeCount: number;
    onClick: () => void;
    onMenuClick: (rect: DOMRect) => void;
    currency: 'USD' | 'EUR';
}> = ({ strategy, totalProfit, tradeCount, onClick, onMenuClick, currency }) => {
    const { language } = useLanguage();
    const timerRef = React.useRef<number | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = () => {
        timerRef.current = window.setTimeout(() => {
            triggerHaptic('medium');
            if (cardRef.current) {
                // Pass the card's rect for the animation origin on long press
                onMenuClick(cardRef.current.getBoundingClientRect());
            }
        }, 500);
    };

    const handleTouchEnd = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const handleClick = () => {
        onClick();
    };

    const formatCurrency = (value: number) => {
        const symbol = currency === 'USD' ? '$' : '€';
        const sign = value >= 0 ? '+' : '-';
        const numberPart = new Intl.NumberFormat(language, {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(value));

        if (language === 'fr') {
            return `${sign}${numberPart}${symbol}`;
        }
        return `${sign}${symbol}${numberPart}`;
    };

    const profitColor = totalProfit >= 0 ? 'text-green-400' : 'text-red-400';

    return (
        <div
            ref={cardRef}
            className="bg-[#16152c] p-5 rounded-3xl border border-gray-700/50 shadow-lg relative overflow-hidden group animate-spring-up transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:border-cyan-500/30 cursor-pointer"
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="bg-cyan-900/30 p-2 rounded-xl text-cyan-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                
                {/* Kebab Menu Button */}
                <button 
                    className="p-2 -mr-2 -mt-2 text-gray-500 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Clear the long press timer if the button is clicked directly
                        if (timerRef.current) clearTimeout(timerRef.current);
                        onMenuClick(e.currentTarget.getBoundingClientRect());
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                </button>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1 truncate pr-6">{strategy.name}</h3>
            
            <div className="flex items-center text-xs text-gray-400 mb-4">
                <span className="truncate">
                    {strategy.criteria.comment ? `Comment: ${strategy.criteria.comment}` : 'Magic: N/A'}
                </span>
            </div>

            <div className="border-t border-gray-700/50 pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Net Profit</p>
                <p className={`text-xl font-bold ${profitColor}`}>{formatCurrency(totalProfit)}</p>
            </div>
        </div>
    );
};

const StrategyView: React.FC<StrategyViewProps> = ({ processedData, currency = 'USD', initialBalance, onLogout, strategies, onSaveStrategy, onDeleteStrategy, onStrategySelect }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    
    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    
    // Action Menu State
    const [activeStrategyForAction, setActiveStrategyForAction] = useState<Strategy | null>(null);
    const [actionMenuOrigin, setActionMenuOrigin] = useState<DOMRect | null>(null);

    const [strategyToEdit, setStrategyToEdit] = useState<Strategy | null>(null);
    const [strategyToDelete, setStrategyToDelete] = useState<Strategy | null>(null);
    
    const [cloudStrategies, setCloudStrategies] = useState<Strategy[]>([]);
    const [isLoadingCloud, setIsLoadingCloud] = useState(false);

    // Filter closed trades once
    const allTrades = useMemo(() => processedData?.closedTrades || [], [processedData]);

    // Extract unique comments for the Add Modal & Recommendations
    const uniqueComments = useMemo(() => {
        const comments = new Set<string>();
        allTrades.forEach(t => {
            if (t.comment) comments.add(t.comment);
        });
        return Array.from(comments);
    }, [allTrades]);

    const handleSaveStrategy = (strategyData: { name: string, criteria: any, id?: string }) => {
        onSaveStrategy(strategyData);
        setIsFormModalOpen(false);
        setStrategyToEdit(null);
        triggerHaptic('success');
    };

    const handleMenuOpen = (strategy: Strategy, origin: DOMRect) => {
        setActiveStrategyForAction(strategy);
        setActionMenuOrigin(origin);
        setIsActionModalOpen(true);
        triggerHaptic('light');
    };

    const handleEditAction = () => {
        if (activeStrategyForAction) {
            setStrategyToEdit(activeStrategyForAction);
            // Close action modal first, then open form
            setTimeout(() => setIsFormModalOpen(true), 100);
        }
    };

    const handleDeleteAction = () => {
        if (activeStrategyForAction) {
            setStrategyToDelete(activeStrategyForAction);
        }
    };

    const handleConfirmDelete = () => {
        if (strategyToDelete) {
            onDeleteStrategy(strategyToDelete.id);
            setStrategyToDelete(null);
            triggerHaptic('heavy');
        }
    };

    // --- Import Logic ---
    const handleOpenImport = async () => {
        if (!user) {
            setIsLoginModalOpen(true);
            return;
        }
        setIsLoadingCloud(true);
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().strategies) {
                const remote: Strategy[] = docSnap.data().strategies;
                const localIds = new Set(strategies.map(s => s.id));
                const newOnes = remote.filter(s => !localIds.has(s.id));
                setCloudStrategies(newOnes);
                setIsImportModalOpen(true);
            } else {
                setCloudStrategies([]);
                setIsImportModalOpen(true);
            }
        } catch (e) {
            console.error("Error fetching cloud strategies:", e);
            alert(t('strategy.fetch_failed'));
        } finally {
            setIsLoadingCloud(false);
        }
    };

    const handleImportStrategies = (imported: Strategy[]) => {
        imported.forEach(s => {
            onSaveStrategy({ name: s.name, criteria: s.criteria, id: s.id });
        });
        triggerHaptic('success');
    };

    const strategyStats = useMemo(() => {
        return strategies.map(s => {
            let filtered = [];
            if (s.criteria.comment) {
                filtered = allTrades.filter(t => t.comment === s.criteria.comment);
            }
            const totalProfit = filtered.reduce((sum, t) => sum + t.profit + t.commission + t.swap, 0);
            return { id: s.id, totalProfit, tradeCount: filtered.length, filteredTrades: filtered };
        });
    }, [strategies, allTrades]);

    return (
        <div className="h-full flex flex-col pb-24 md:pb-0">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white">{t('strategy.title')}</h2>
                <div className="flex gap-2">
                    {/* Import Button */}
                    <button
                        onClick={handleOpenImport}
                        disabled={isLoadingCloud}
                        className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 text-cyan-400 rounded-2xl shadow-md transition-all disabled:opacity-50"
                        title={t('strategy.import_button')}
                    >
                        {isLoadingCloud ? (
                            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        )}
                    </button>

                    <button 
                        onClick={() => {
                            setStrategyToEdit(null);
                            setIsFormModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-lg transition-transform transform hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        <span className="hidden sm:inline">{t('strategy.add_strategy')}</span>
                        <span className="sm:hidden">{t('common.add')}</span>
                    </button>
                </div>
            </div>

            {strategies.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#16152c] rounded-3xl border border-gray-700/50 border-dashed">
                    <div className="bg-gray-800/50 p-6 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    </div>
                    <p className="text-gray-400 max-w-xs">{t('strategy.no_strategies')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {strategies.map((strategy) => {
                        const stats = strategyStats.find(s => s.id === strategy.id);
                        return (
                            <StrategyCard
                                key={strategy.id}
                                strategy={strategy}
                                totalProfit={stats?.totalProfit || 0}
                                tradeCount={stats?.tradeCount || 0}
                                onClick={() => onStrategySelect(strategy)}
                                onMenuClick={(rect) => handleMenuOpen(strategy, rect)}
                                currency={currency}
                            />
                        );
                    })}
                </div>
            )}

            <AddStrategyModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setStrategyToEdit(null);
                }}
                onSave={handleSaveStrategy}
                existingComments={uniqueComments}
                strategyToEdit={strategyToEdit}
            />

            <StrategyImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportStrategies}
                availableStrategies={cloudStrategies}
                existingComments={uniqueComments}
            />

            <LoginRequiredModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onLogin={onLogout}
            />

            <StrategyActionModal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                onEdit={handleEditAction}
                onDelete={handleDeleteAction}
                strategyName={activeStrategyForAction?.name || ''}
                originRect={actionMenuOrigin}
            />

            <DeleteConfirmationModal
                isOpen={!!strategyToDelete}
                onClose={() => setStrategyToDelete(null)}
                onConfirm={handleConfirmDelete}
                accountName={strategyToDelete ? strategyToDelete.name : ''}
            />
        </div>
    );
};

export default StrategyView;
