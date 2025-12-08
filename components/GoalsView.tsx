
import React, { useState, useEffect } from 'react';
import { DashboardMetrics, Goals, Goal, GoalMetric } from '../types';
import GoalCard from './GoalCard';
import { useLanguage } from '../contexts/LanguageContext';
import Toggle from './Toggle';
import { triggerHaptic } from '../utils/haptics';

interface GoalsViewProps {
  metrics: DashboardMetrics;
  accountGoals: Goals;
  onSaveGoals: (goals: Goals) => void;
  currency: 'USD' | 'EUR';
}

const goalDefinitions: { key: GoalMetric; titleKey: string; isLessBetter?: boolean, isPercent?: boolean }[] = [
    { key: 'netProfit', titleKey: 'goals.metric_netProfit' },
    { key: 'winRate', titleKey: 'goals.metric_winRate', isPercent: true },
    { key: 'profitFactor', titleKey: 'goals.metric_profitFactor' },
    { key: 'maxDrawdown', titleKey: 'goals.metric_maxDrawdown', isLessBetter: true, isPercent: true },
];

const GoalsView: React.FC<GoalsViewProps> = ({ metrics, accountGoals, onSaveGoals, currency }) => {
    const { t, language } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [editableGoals, setEditableGoals] = useState<Goals>(accountGoals);
    
    useEffect(() => {
        setEditableGoals(accountGoals);
    }, [accountGoals]);

    const handleGoalChange = (metric: GoalMetric, value: string) => {
        const target = parseFloat(value);
        setEditableGoals(prev => {
            const currentGoal = prev[metric] || { enabled: false, target: 0, showOnChart: false };
            return {
                ...prev,
                [metric]: { ...currentGoal, target: isNaN(target) ? 0 : target }
            };
        });
    };
    
    const handleToggleGoal = (metric: GoalMetric, enabled: boolean) => {
        setEditableGoals(prev => {
            const currentGoal = prev[metric] || { target: 0, enabled: false, showOnChart: false };
            return {
                ...prev,
                [metric]: { ...currentGoal, enabled }
            };
        });
    };
    
    const handleToggleShowOnChart = (metric: GoalMetric, show: boolean) => {
        setEditableGoals(prev => {
            const currentGoal = prev[metric] || { target: 0, enabled: false, showOnChart: false };
            return {
                ...prev,
                [metric]: { ...currentGoal, showOnChart: show }
            };
        });
    };

    const handleSave = () => {
        onSaveGoals(editableGoals);
        setIsEditing(false);
        triggerHaptic('success');
    };

    const handleCancel = () => {
        setEditableGoals(accountGoals);
        setIsEditing(false);
    };

    const formatValue = (value: number, isPercent: boolean = false) => {
        if (isPercent) {
            return `${value.toFixed(2)}%`;
        }
        
        const symbol = currency === 'USD' ? '$' : '€';
        if (language === 'fr') {
            const numberPart = new Intl.NumberFormat('fr', {
                style: 'decimal',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(value);
            return `${numberPart}${symbol}`;
        }
        
        return new Intl.NumberFormat(language, {
            style: 'currency',
            currency: currency,
            currencyDisplay: 'symbol',
        }).format(value);
    };
    
    const getMetricValue = (metric: GoalMetric): number => {
        switch (metric) {
            case 'netProfit': return metrics.netProfit;
            case 'winRate': return metrics.winRate;
            case 'profitFactor': return metrics.profitFactor || 0;
            case 'maxDrawdown': return metrics.maxDrawdown.percentage;
            default: return 0;
        }
    };

    const enabledGoals = goalDefinitions
        .map(def => ({ ...def, goal: accountGoals[def.key] }))
        .filter(item => item.goal && item.goal.enabled);
    
    return (
        <div className="bg-[#16152c] p-4 sm:p-6 rounded-3xl shadow-lg border border-gray-700/50">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-bold text-white">{t('goals.title')}</h2>
                    <p className="text-gray-400">{t('goals.subtitle')}</p>
                </div>
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-md transition-transform transform hover:scale-105">
                        {t('goals.edit_goals')}
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={handleCancel} className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-2xl shadow-md transition-transform transform hover:scale-105">
                            {t('goals.cancel')}
                        </button>
                        <button onClick={handleSave} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-md transition-transform transform hover:scale-105">
                            {t('goals.save_goals')}
                        </button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {goalDefinitions.map(({ key, titleKey }) => {
                        const goal = editableGoals[key] || { enabled: false, target: 0, showOnChart: false };
                        const canShowOnChart = key === 'netProfit' || key === 'maxDrawdown';

                        return (
                            <div key={key} className={`p-4 rounded-2xl border ${goal.enabled ? 'bg-[#0c0b1e]/60 border-gray-700' : 'bg-gray-800/30 border-gray-800'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-lg font-semibold text-white">{t(titleKey)}</label>
                                    <Toggle enabled={goal.enabled} onChange={(val) => handleToggleGoal(key, val)} />
                                </div>
                                {goal.enabled && (
                                    <div className="space-y-3 animate-fade-in">
                                        <input
                                            type="number"
                                            value={goal.target || ''}
                                            onChange={(e) => handleGoalChange(key, e.target.value)}
                                            placeholder={t('goals.target')}
                                            className="w-full px-4 py-2 bg-[#0c0b1e] border border-gray-600 rounded-2xl text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
                                        />
                                        {canShowOnChart && (
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm text-gray-300">
                                                    {t('goals.show_on_chart')}
                                                </label>
                                                <Toggle enabled={!!goal.showOnChart} onChange={(val) => handleToggleShowOnChart(key, val)} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {enabledGoals.length === 0 ? (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            <p>No goals set. Click 'Edit Goals' to get started.</p>
                        </div>
                    ) : (
                        enabledGoals.map(({ key, titleKey, isLessBetter, isPercent, goal }, index) => (
                             <div 
                                key={key} 
                                className="animate-fade-in-up" 
                                style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}
                            >
                                <GoalCard
                                    title={t(titleKey)}
                                    currentValue={getMetricValue(key)}
                                    targetValue={goal.target}
                                    formatValue={formatValue}
                                    isLessBetter={isLessBetter}
                                    isPercent={isPercent}
                                />
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default GoalsView;
