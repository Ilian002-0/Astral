import React from 'react';

export const SyncIcon: React.FC<{ isSyncing?: boolean }> = ({ isSyncing }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-gray-300 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.9998C3 7.02919 7.02944 2.99976 12 2.99976C14.8273 2.99976 17.35 4.30342 19 6.34242" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 2.99976L19.5 6.99976L15.5 6.99976" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.9998C21 16.9703 16.9706 20.9998 12 20.9998C9.17273 20.9998 6.64996 19.6961 5 17.6571" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.9998L4.5 16.9998L8.5 16.9998" />
    </svg>
);
