import React from 'react';

const StatCard: React.FC<{ title: string; value: string; colorClass?: string; tooltip?: string }> = ({ title, value, colorClass = 'text-white', tooltip }) => (
  <div className="bg-gray-800/50 p-4 rounded-xl shadow-lg border border-gray-700/50 transform transition-all duration-300 hover:scale-105 hover:bg-gray-800 group relative">
    <div className="flex justify-between items-center space-x-4">
        <h3 className="text-sm font-medium text-gray-400 truncate">{title}</h3>
        <p className={`text-stat-value-md md:text-stat-value font-bold whitespace-nowrap ${colorClass}`}>{value}</p>
    </div>
    {tooltip && (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" data-popper-arrow />
      </div>
    )}
  </div>
);

export default StatCard;