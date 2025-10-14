import React from 'react';
import { DailySummary } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface DailyResultsTableProps {
  data: DailySummary[];
}

const DailyResultsTable: React.FC<DailyResultsTableProps> = ({ data }) => {
  const { t, language } = useLanguage();
  const totalResult = data.reduce((sum, day) => sum + day.profit, 0);

  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}$${new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value))}`;
  };

  return (
    <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
                    <tr>
                        <th scope="col" className="px-3 sm:px-6 py-3">{t('dashboard.date')}</th>
                        <th scope="col" className="px-3 sm:px-6 py-3 text-right">{t('day_modal.daily_return')}</th>
                        <th scope="col" className="px-3 sm:px-6 py-3 text-right">{t('dashboard.result')}</th>
                    </tr>
                </thead>
                <tbody>
                    {data.slice(0, 10).map((day) => {
                        const isProfit = day.profit >= 0;
                        const displayDate = new Date(day.dateKey + 'T00:00:00Z').toLocaleDateString(language, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'UTC'
                        });
                        const returnColor = day.dailyReturnPercent >= 0 ? 'text-green-400' : 'text-red-400';

                        return (
                            <tr key={day.dateKey} className="border-b border-gray-800">
                                <td className="px-3 sm:px-6 py-4 font-medium text-white">{displayDate}</td>
                                <td className={`px-3 sm:px-6 py-4 text-right ${returnColor}`}>
                                    {day.dailyReturnPercent.toFixed(2)}%
                                </td>
                                <td className={`px-3 sm:px-6 py-4 text-right font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(day.profit)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="font-semibold text-white">
                        <td colSpan={2} className="px-3 sm:px-6 py-4 text-base font-bold">{t('dashboard.total_result')}</td>
                        <td className={`px-3 sm:px-6 py-4 text-right text-base font-bold ${totalResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(totalResult)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
  );
};

export default DailyResultsTable;