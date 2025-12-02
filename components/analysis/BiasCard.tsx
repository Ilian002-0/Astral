
import React from 'react';

interface BiasCardProps {
    biasStats: {
        buys: number;
        sells: number;
        total: number;
        buyPct: number;
        sellPct: number;
        biasLabel: string;
    };
    isBearDominant: boolean;
    isBullDominant: boolean;
    stripeStyle: React.CSSProperties;
}

const BiasCard: React.FC<BiasCardProps> = ({ biasStats, isBearDominant, isBullDominant, stripeStyle }) => {
    return (
        <div className="bg-[#16152c] p-6 lg:p-4 rounded-2xl shadow-lg border border-gray-700/50 flex flex-col justify-center">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 lg:mb-2">
                <h3 className="text-gray-400 font-medium text-sm sm:text-base">Behavioral Bias</h3>
                <h3 className="text-white font-bold text-sm sm:text-base">Total Trades: {biasStats.total}</h3>
            </div>

            <div className="relative h-32 lg:h-24 flex items-center justify-between px-4 mb-4 lg:mb-2">
                {/* Centered Text */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg text-center">{biasStats.biasLabel}</h2>
                </div>

                {/* Bear Image */}
                <img 
                    src="https://i.imgur.com/07RKkwK.png" 
                    alt="Bear"
                    className={`h-24 w-24 sm:h-32 sm:w-32 lg:h-20 lg:w-20 object-contain transition-all duration-500 z-0 ${
                        isBearDominant
                        ? 'opacity-100 scale-110 drop-shadow-[0_0_15px_rgba(251,146,60,0.5)]' 
                        : 'opacity-40 grayscale scale-100'
                    }`} 
                />
                
                {/* Bull Image */}
                <img 
                    src="https://i.imgur.com/D83p1q4.png" 
                    alt="Bull" 
                    className={`h-24 w-24 sm:h-32 sm:w-32 lg:h-20 lg:w-20 object-contain transition-all duration-500 z-0 ${
                        isBullDominant
                        ? 'opacity-100 scale-110 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]' 
                        : 'opacity-40 grayscale scale-100'
                    }`} 
                />
            </div>

            {/* Divergent Progress Bar (Center is 0%) */}
            <div className="relative w-full h-8 lg:h-6 flex items-center mb-2 lg:mb-1">
                {/* Middle Marker (0%) */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-500 z-20 -translate-x-1/2"></div>

                {/* Left Side (Sell) */}
                <div className="w-1/2 relative h-full bg-gray-800/30 rounded-l-full overflow-hidden flex justify-end" style={stripeStyle}>
                     <div 
                        className={`h-full transition-all duration-500 ${isBearDominant ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]' : 'bg-orange-600/70'} rounded-l-full`}
                        style={{ width: `${biasStats.sellPct}%` }}
                     />
                </div>

                {/* Right Side (Buy) */}
                <div className="w-1/2 relative h-full bg-gray-800/30 rounded-r-full overflow-hidden flex justify-start" style={stripeStyle}>
                    <div 
                        className={`h-full transition-all duration-500 ${isBullDominant ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'bg-cyan-600/70'} rounded-r-full`}
                        style={{ width: `${biasStats.buyPct}%` }}
                    />
                </div>
            </div>

            <div className="relative h-6 mt-1">
                <div className={`absolute left-0 top-0 text-sm font-medium transition-colors ${isBearDominant ? 'text-orange-400 font-bold' : 'text-gray-400'}`}>
                    {biasStats.sells} ({biasStats.sellPct.toFixed(1)}%)
                </div>
                
                <div className="absolute left-1/2 top-0 -translate-x-1/2 text-xs text-gray-500">
                    0%
                </div>

                <div className={`absolute right-0 top-0 text-sm font-medium transition-colors ${isBullDominant ? 'text-cyan-400 font-bold' : 'text-gray-400'}`}>
                    {biasStats.buys} ({biasStats.buyPct.toFixed(1)}%)
                </div>
            </div>
        </div>
    );
};

export default BiasCard;
