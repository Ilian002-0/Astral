import React, { useState, useEffect } from 'react';
import { DashboardMetrics, Goals, Goal, GoalMetric } from '../types';
import GoalCard from './GoalCard';
import { useLanguage } from '../contexts/LanguageContext';

interface GoalsViewProps {
  metrics: DashboardMetrics;
  accountGoals: Goals;
  onSaveGoals: (goals: Goals) => void;
}

const goalDefinitions: { key: GoalMetric; titleKey: string; isLessBetter?: boolean, isPercent?: boolean }[] = [
    { key: 'netProfit', titleKey: 'goals.metric_netProfit' },
    { key: 'winRate', titleKey: 'goals.metric_winRate', isPercent: true },
    { key: 'profitFactor', titleKey: 'goals.metric_profitFactor' },
    { key: 'maxDrawdown', titleKey: 'goals.metric_maxDrawdown', isLessBetter: true, isPercent: true },
];

const GoalsView: React.FC<GoalsViewProps> = ({ metrics, accountGoals, onSaveGoals }) => {
    const { t, language } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [editableGoals, setEditableGoals] = useState<Goals>(accountGoals);
    
    useEffect(() => {
        setEditableGoals(accountGoals);
    }, [accountGoals]);

    const handleGoalChange = (metric: GoalMetric, value: string) => {
        const target = parseFloat(value);
        setEditableGoals(prev => ({
            ...prev,
            [metric]: { ...prev[metric], target: isNaN(target) ? 0 : target }
        }));
    };
    
    const handleToggleGoal = (metric: GoalMetric) => {
        const currentGoal = editableGoals[metric] || { target: 0, enabled: false };
        setEditableGoals(prev => ({
            ...prev,
            [metric]: { ...currentGoal, enabled: !currentGoal.enabled }
        }));
    };
    
    const handleSave = () => {
        onSaveGoals(editableGoals);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditableGoals(accountGoals);
        setIsEditing(false);
    };

    const formatValue = (value: number, isPercent: boolean = false) => {
        if (isPercent) {
            return `${value.toFixed(2)}%`;
        }
        return new Intl.NumberFormat(language, {
            style: 'currency',
            currency: 'USD',
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
    
    return (
        <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-bold text-white">{t('goals.title')}</h2>
                    <p className="text-gray-400">{t('goals.subtitle')}</p>
                </div>
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105">
                        {t('goals.edit_goals')}
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={handleCancel} className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105">
                            {t('goals.cancel')}
                        </button>
                        <button onClick={handleSave} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105">
                            {t('goals.save_goals')}
                        </button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {goalDefinitions.map(({ key, titleKey }) => {
                        const goal = editableGoals[key] || { enabled: false, target: 0 };
                        return (
                            <div key={key} className={`p-4 rounded-xl border ${goal.enabled ? 'bg-[#0c0b1e]/60 border-gray-700' : 'bg-gray-800/30 border-gray-800'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <label htmlFor={`${key}-toggle`} className="text-lg font-semibold text-white">{t(titleKey)}</label>
                                    <input
                                        type="checkbox"
                                        id={`${key}-toggle`}
                                        checked={goal.enabled}
                                        onChange={() => handleToggleGoal(key)}
                                        className="form-checkbox h-5 w-5 bg-gray-900 border-gray-600 rounded text-cyan-500 focus:ring-cyan-600 cursor-pointer"
                                    />
                                </div>
                                <input
                                    type="number"
                                    value={goal.target || ''}
                                    onChange={(e) => handleGoalChange(key, e.target.value)}
                                    placeholder={t('goals.target')}
                                    disabled={!goal.enabled}
                                    className="w-full px-4 py-2 bg-[#0c0b1e] border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-800/50 disabled:text-gray-500"
                                />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {goalDefinitions.map(({ key, titleKey, isLessBetter, isPercent }) => {
                        const goal = accountGoals[key];
                        if (!goal || !goal.enabled) return null;

                        return (
                            <GoalCard
                                key={key}
                                title={t(titleKey)}
                                currentValue={getMetricValue(key)}
                                targetValue={goal.target}
                                formatValue={formatValue}
                                isLessBetter={isLessBetter}
                                isPercent={isPercent}
                            />
                        );
                    }).filter(Boolean).length === 0 ? (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            <p>No goals set. Click 'Edit Goals' to get started.</p>
                        </div>
                    ) : (
                        goalDefinitions.map(({ key, titleKey, isLessBetter, isPercent }) => {
                        const goal = accountGoals[key];
                        if (!goal || !goal.enabled) return null;

                        return (
                            <GoalCard
                                key={key}
                                title={t(titleKey)}
                                currentValue={getMetricValue(key)}
                                targetValue={goal.target}
                                formatValue={formatValue}
                                isLessBetter={isLessBetter}
                                isPercent={isPercent}
                            />
                        );
                    })
                    )}
                </div>
            )}
        </div>
    );
};

export default GoalsView;
