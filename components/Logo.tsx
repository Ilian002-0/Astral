import React from 'react';

interface LogoProps {
    layout: 'mobile' | 'desktop';
}

// The SVG icon is now an inline component, eliminating the need for an external file request.
const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        className={className} 
        fill="currentColor" 
        viewBox="0 0 512 512" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        shapeRendering="geometricPrecision"
    >
        <path d="M429.84 384l-173.84 67.84l-173.84-67.84l-28.832 50l202.672 78l202.672-78zM256 0c-111.92 0-202.672 90.752-202.672 202.672s90.752 202.672 202.672 202.672c111.92 0 202.672-90.752 202.672-202.672s-90.752-202.672-202.672-202.672zM256 343.008c-77.424 0-140.08-62.752-140.08-140.08c0-77.424 62.672-140.16 140.08-140.16s140.08 62.752 140.08 140.16c0 77.328-62.672 140.08-140.08 140.08z"/>
    </svg>
);


const Logo: React.FC<LogoProps> = ({ layout }) => {
    if (layout === 'mobile') {
        return (
            <div className="flex items-center gap-2 text-[#8B9BBD]">
                <LogoIcon className="h-10 w-10" />
                <span className="text-xl font-bold tracking-widest">ATLAS</span>
            </div>
        );
    }

    // Desktop layout
    return (
        <div className="flex items-center justify-center text-center flex-col h-full text-[#8B9BBD]">
            <LogoIcon className="h-16 w-16" />
            <span className="mt-2 text-xl font-bold tracking-[5px]">ATLAS</span>
        </div>
    );
};

export default Logo;