
import React, { useState, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CustomTooltip from '../charts/CustomTooltip';

const COLORS = ['#22d3ee', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#94a3b8']; // Cyan, Emerald, Pink, Violet, Orange, Gray

interface SymbolPieChartProps {
    data: any[];
    currency: 'USD' | 'EUR';
    title: string;
}

const SymbolPieChart: React.FC<SymbolPieChartProps> = ({ data, currency, title }) => {
    const [isChartReady, setIsChartReady] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setTimeout(() => {
                        setIsChartReady(true);
                    }, 0);
                    resizeObserver.disconnect();
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div className="bg-[#16152c] p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            <div ref={containerRef} style={{ width: '100%', height: 300 }}>
                {isChartReady && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip currency={currency} />} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default SymbolPieChart;
