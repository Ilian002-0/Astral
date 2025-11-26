
import React from 'react';

const SkeletonBase: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-800/50 rounded-lg ${className}`} />
);

export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Skeleton */}
            <div className="p-6 rounded-3xl border border-gray-700/30 h-48 bg-gray-800/20 flex flex-col justify-center items-center space-y-4">
                 <div className="w-1/3 h-4 bg-gray-700/50 rounded"></div>
                 <div className="w-1/2 h-12 bg-gray-700/50 rounded"></div>
                 <div className="w-1/4 h-6 bg-gray-700/50 rounded"></div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-[#16152c] p-4 rounded-xl border border-gray-700/50 h-24 flex items-center space-x-4">
                        <SkeletonBase className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2 flex-1">
                            <SkeletonBase className="h-3 w-1/2" />
                            <SkeletonBase className="h-6 w-3/4" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart Skeleton */}
            <div className="bg-[#16152c] p-6 rounded-2xl border border-gray-700/50 h-[400px] flex flex-col">
                <div className="flex justify-between mb-4">
                    <SkeletonBase className="h-6 w-32" />
                    <SkeletonBase className="h-8 w-24" />
                </div>
                <SkeletonBase className="flex-1 w-full rounded-xl" />
            </div>

            {/* Recent Trades Skeleton */}
            <div className="bg-[#16152c] p-6 rounded-2xl border border-gray-700/50">
                <SkeletonBase className="h-6 w-40 mb-4" />
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                         <div key={i} className="flex justify-between items-center h-10 border-b border-gray-800/50">
                            <SkeletonBase className="h-3 w-1/5" />
                            <SkeletonBase className="h-3 w-1/4" />
                            <SkeletonBase className="h-3 w-1/6" />
                            <SkeletonBase className="h-3 w-1/6" />
                         </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const TradesListSkeleton: React.FC = () => {
    return (
        <div className="bg-[#16152c] rounded-2xl border border-gray-700/50 h-full flex flex-col animate-fade-in">
            {/* Header / Search */}
            <div className="flex justify-between items-center p-6 border-b border-gray-700/50">
                <SkeletonBase className="h-8 w-32" />
                <SkeletonBase className="h-10 w-48" />
            </div>
            {/* Table Header */}
            <div className="h-10 bg-[#16152c] border-b border-gray-700 flex items-center px-4 gap-4">
                <SkeletonBase className="h-3 w-16" />
                <SkeletonBase className="h-3 w-24" />
                <SkeletonBase className="h-3 w-16" />
                <SkeletonBase className="h-3 flex-1" />
            </div>
            {/* Rows */}
            <div className="flex-1 p-2 space-y-2 overflow-hidden">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between h-14 px-2 border-b border-gray-800/50">
                         <div className="space-y-1 w-20">
                             <SkeletonBase className="h-3 w-12" />
                             <SkeletonBase className="h-2 w-8" />
                         </div>
                         <SkeletonBase className="h-4 w-16" />
                         <SkeletonBase className="h-4 w-12" />
                         <SkeletonBase className="h-4 w-24" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const CalendarSkeleton: React.FC = () => {
    return (
        <div className="bg-[#16152c] p-6 rounded-2xl border border-gray-700/50 animate-fade-in h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <SkeletonBase className="h-8 w-8 rounded-full" />
                <SkeletonBase className="h-8 w-40" />
                <SkeletonBase className="h-8 w-8 rounded-full" />
            </div>
            
            <div className="lg:grid lg:grid-cols-[1fr_12rem] lg:gap-8 h-full">
                <div>
                     {/* Days Header */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="text-center">
                                <SkeletonBase className="h-3 w-6 mx-auto" />
                            </div>
                        ))}
                    </div>
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {[...Array(35)].map((_, i) => (
                            <SkeletonBase key={i} className="h-16 sm:h-20 w-full rounded-lg" />
                        ))}
                    </div>
                </div>
                 {/* Weekly Summary Side */}
                 <div className="mt-6 lg:mt-0 space-y-4">
                    <SkeletonBase className="h-6 w-32 mx-auto lg:mx-0" />
                    {[...Array(5)].map((_, i) => (
                         <SkeletonBase key={i} className="h-16 w-full rounded-lg" />
                    ))}
                 </div>
            </div>
        </div>
    );
};

export const AnalysisSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between">
                <SkeletonBase className="h-8 w-48" />
                <SkeletonBase className="h-10 w-32" />
             </div>
             
             {/* Filters */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#16152c] rounded-2xl border border-gray-700/50">
                <SkeletonBase className="h-10 w-full" />
                <SkeletonBase className="h-10 w-full" />
                <SkeletonBase className="h-10 w-full" />
                <SkeletonBase className="h-10 w-full" />
             </div>

             {/* Chart */}
             <div className="bg-[#16152c] p-6 rounded-2xl border border-gray-700/50 h-[400px]">
                 <SkeletonBase className="w-full h-full rounded-xl" />
             </div>
             
             {/* Filtered Table */}
             <div className="bg-[#16152c] p-6 rounded-2xl border border-gray-700/50">
                <SkeletonBase className="h-6 w-40 mb-4" />
                <div className="space-y-3">
                    {[...Array(8)].map((_, i) => (
                        <SkeletonBase key={i} className="h-12 w-full" />
                    ))}
                </div>
             </div>
        </div>
    )
}

export const GenericSkeleton: React.FC = () => (
    <div className="space-y-6 p-4 animate-fade-in">
        <SkeletonBase className="h-8 w-1/3" />
        <div className="space-y-4">
            <SkeletonBase className="h-32 w-full" />
            <SkeletonBase className="h-32 w-full" />
            <SkeletonBase className="h-32 w-full" />
        </div>
    </div>
);
