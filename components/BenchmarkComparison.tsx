
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface BenchmarkComparisonProps {
  userReturn: number;
  benchmarkReturn: number;
}

const Stat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="text-center">
        <p className="text-sm text-gray-400 h-10 flex items-center justify-center">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
);

const Bar: React.FC<{ value: number; scale: number; color: string; label: string }> = ({ value, scale, color, label }) => {
    const width = scale > 0 ? (Math.abs(value) / scale) * 100 : 0;
    const isNegative = value < 0;

    return (
        <div>
            <div className="flex justify-between items-center text-xs mb-1 min-h-[2rem]">
                <span className="text-gray-300">{label}</span>
                <span className={`font-bold ${value >= 0 ? 'text-green-400' : 'text-red-400'} whitespace-nowrap`}>{value.toFixed(2)}%</span>
            </div>
            <div className="h-6 bg-gray-800/50 rounded-lg overflow-hidden relative">
                <div className="absolute top-0 left-1/2 w-px h-full bg-gray-600"></div>
                <div
                    className={`h-full rounded-lg ${color}`}
                    style={{
                        width: `${width / 2}%`,
                        position: 'absolute',
                        top: 0,
                        left: isNegative ? `calc(50% - ${width / 2}%)` : '50%',
                        transition: 'width 0.5s ease-out',
                    }}
                />
            </div>
        </div>
    );
};


const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({ userReturn, benchmarkReturn }) => {
    const { t } = useLanguage();
    const outperformance = userReturn - benchmarkReturn;

    const outperformanceColor = outperformance >= 0 ? 'text-green-400' : 'text-red-400';
    const userReturnColor = userReturn >= 0 ? 'text-green-400' : 'text-red-400';
    const benchmarkReturnColor = benchmarkReturn >= 0 ? 'text-green-400' : 'text-red-400';
    
    // Scale for bar chart visualization
    const scale = Math.max(Math.abs(userReturn), Math.abs(benchmarkReturn), 10); // at least 10% scale

    const userBarColor = userReturn >= 0 ? 'bg-green-500' : 'bg-red-500';
    const benchmarkBarColor = benchmarkReturn >= 0 ? 'bg-gray-400' : 'bg-gray-600';

    return (
        <div className="bg-[#16152c] p-4 sm:p-6 rounded-3xl shadow-lg border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">{t('benchmark.title')}</h3>
            <div className="grid grid-cols-3 gap-4 mb-6 border-b border-t border-gray-700/50 py-4">
                <Stat label={t('benchmark.your_return')} value={`${userReturn.toFixed(2)}%`} color={userReturnColor} />
                <Stat label={t('benchmark.benchmark_return')} value={`${benchmarkReturn.toFixed(2)}%`} color={benchmarkReturnColor} />
                <Stat label={t('benchmark.outperformance')} value={`${outperformance > 0 ? '+' : ''}${outperformance.toFixed(2)}%`} color={outperformanceColor} />
            </div>
            <div className="space-y-4">
                <Bar value={userReturn} scale={scale} color={userBarColor} label={t('benchmark.your_performance')} />
                <Bar value={benchmarkReturn} scale={scale} color={benchmarkBarColor} label={t('benchmark.benchmark_performance')} />
            </div>
        </div>
    );
};

export default BenchmarkComparison;
