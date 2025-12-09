
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

interface GoalCardProps {
  title: string;
  currentValue: number;
  targetValue: number;
  formatValue: (value: number, isPercent?: boolean) => string;
  isLessBetter?: boolean;
  isPercent?: boolean;
}

const GoalCard: React.FC<GoalCardProps> = ({ title, currentValue, targetValue, formatValue, isLessBetter = false, isPercent = false }) => {
  const [isMounted, setIsMounted] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
                // Fix: Use setTimeout to avoid Recharts "width(-1)" warning
                setTimeout(() => {
                    setIsMounted(true);
                }, 0);
                resizeObserver.disconnect();
            }
        }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const { progress, color, isMet } = useMemo(() => {
    if (targetValue === 0 && currentValue > 0) return { progress: 100, color: '#2dd4bf', isMet: true };
    if (targetValue === 0) return { progress: 0, color: '#374151', isMet: false };

    let progressPercent = 0;
    let goalMet = false;

    if (isLessBetter) {
      // Lower is better (e.g., max drawdown)
      goalMet = currentValue <= targetValue;
      // Progress is 100% if current is 0, and 0% if current is at or above target
      progressPercent = Math.max(0, 1 - (currentValue / targetValue)) * 100;
    } else {
      // Higher is better (e.g., profit, win rate)
      goalMet = currentValue >= targetValue;
      progressPercent = (currentValue / targetValue) * 100;
    }

    const progressColor = goalMet ? '#22c55e' : '#2dd4bf'; // Green if met, otherwise cyan

    return {
      progress: Math.min(100, progressPercent), // Cap progress at 100% for visualization
      color: progressColor,
      isMet: goalMet,
    };
  }, [currentValue, targetValue, isLessBetter]);

  const chartData = [{ name: 'progress', value: progress }];
  
  return (
    <div className="bg-[#0c0b1e]/60 p-4 rounded-3xl shadow-lg border border-gray-700/50 text-center h-full flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-semibold text-white truncate">{title}</h3>
        {isLessBetter && <p className="text-xs text-gray-500">(lower is better)</p>}
      </div>
      <div className="relative w-32 h-32 mx-auto my-4" ref={chartContainerRef}>
        {isMounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <RadialBarChart
                innerRadius="80%"
                outerRadius="100%"
                data={chartData}
                startAngle={90}
                endAngle={-270}
                barSize={8}
            >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: '#374151' }} dataKey="value" cornerRadius={10} fill={color} />
            </RadialBarChart>
            </ResponsiveContainer>
        )}
        <div className="absolute inset-0 flex items-center justify-center flex-col">
            {isMet ? (
                <div className="text-sm font-bold text-green-400">Goal Met!</div>
            ) : (
                <div className="text-2xl font-bold" style={{ color: color }}>{`${progress.toFixed(0)}%`}</div>
            )}
        </div>
      </div>
      <div className="text-xs grid grid-cols-2 gap-2">
        <div className="bg-gray-800/50 p-2 rounded-xl">
            <div className="text-gray-400">Current</div>
            <div className="font-bold text-white text-sm truncate">{formatValue(currentValue, isPercent)}</div>
        </div>
        <div className="bg-gray-800/50 p-2 rounded-xl">
            <div className="text-gray-400">Target</div>
            <div className="font-bold text-white text-sm truncate">{formatValue(targetValue, isPercent)}</div>
        </div>
      </div>
    </div>
  );
};

export default GoalCard;
