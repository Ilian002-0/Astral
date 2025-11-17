import React from 'react';

interface LogoProps {
    layout: 'mobile' | 'desktop';
}

// The SVG icon is now an inline component, eliminating the need for an external file request.
const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        className={className} 
        fill="currentColor" 
        viewBox="0 0 32 32" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        <path d="M26.865 24l-10.865 4.24-10.865-4.24-1.802 3.125 12.667 4.875 12.667-4.875zM16 0c-6.995 0-12.667 5.672-12.667 12.667s5.672 12.667 12.667 12.667c6.995 0 12.667-5.672 12.667-12.667s-5.672-12.667-12.667-12.667zM16 21.438c-4.839 0-8.755-3.922-8.755-8.755 0-4.839 3.917-8.76 8.755-8.76s8.755 3.922 8.755 8.76c0 4.833-3.917 8.755-8.755 8.755z"/>
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