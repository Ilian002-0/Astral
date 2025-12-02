
import React from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomTooltip from '../charts/CustomTooltip';

interface MonthlyPerformanceChartProps {
    data: any[];
    currency: 'USD' | 'EUR';
    yAxisTickFormatter: (value: any) => string;
    title: string;
    isMounted: boolean;
}

const MonthlyPerformanceChart: React.FC<MonthlyPerformanceChartProps> = ({ data, currency, yAxisTickFormatter, title, isMounted }) => {
    return (
        <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            <div style={{ width: '100%', height: 300 }}>
                {isMounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
                            <XAxis dataKey="month" stroke="#888" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis stroke="#888" tick={{ fontSize: 12 }} tickFormatter={yAxisTickFormatter} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip currency={currency} />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                            <Bar dataKey="profit" radius={[4, 4, 4, 4]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#4ade80' : '#f87171'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default MonthlyPerformanceChart;
