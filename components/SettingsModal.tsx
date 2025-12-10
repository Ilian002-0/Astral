
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import Toggle from './Toggle';
import { NotificationSettings } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    notificationSettings: NotificationSettings;
    onNotificationSettingsChange: (settings: NotificationSettings) => void;
    onLogout: () => void;
    originRect?: DOMRect | null;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    notificationSettings, 
    onNotificationSettingsChange, 
    onLogout,
    originRect
}) => {
    const { t, language, setLanguage } = useLanguage();
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [isVisible, setIsVisible] = useState(false);
    
    // We lock the scroll while open
    useLockBodyScroll(isOpen);

    useEffect(() => {
        let timeoutId: number;
        if (isOpen) {
            // Use a small delay to ensure the element is mounted and the initial state (opacity-0) is applied
            // before transitioning to opacity-100. This fixes the "no animation on first open" issue.
            timeoutId = window.setTimeout(() => {
                setIsVisible(true);
            }, 10); 
        } else {
            setIsVisible(false);
        }
        return () => clearTimeout(timeoutId);
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        // Wait for the animation to finish before unmounting (300ms matches duration-300)
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
            onNotificationSettingsChange({ tradeClosed: true, weeklySummary: true });
        }
    };

    const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
        if (notificationPermission !== 'granted') {
            requestNotificationPermission();
        } else {
            onNotificationSettingsChange({ ...notificationSettings, [key]: value });
        }
    };

    // Calculate dynamic transform origin to start/end exactly at the button position
    const transformStyle = useMemo(() => {
        if (!originRect || typeof window === 'undefined') return {};

        // Window center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Origin center
        const originX = originRect.left + originRect.width / 2;
        const originY = originRect.top + originRect.height / 2;

        // Difference
        const deltaX = originX - centerX;
        const deltaY = originY - centerY;

        return {
            transformOrigin: `calc(50% + ${deltaX}px) calc(50% + ${deltaY}px)`
        };
    }, [originRect]);

    if (!isOpen) return null;

    return (
        <div 
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isVisible ? '' : 'pointer-events-none'}`}
        >
            {/* Backdrop with independent transition */}
            <div 
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-ios ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            ></div>

            {/* Modal Card with independent transition */}
            <div 
                className={`relative w-full max-w-sm p-6 sm:p-8 bg-[#16152c] border border-gray-700/50 rounded-3xl shadow-2xl transition-all duration-300 ease-ios ${isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} 
                onClick={e => e.stopPropagation()}
                style={transformStyle}
            >
                <div className="flex justify-between items-center mb-6 border-b border-gray-700/50 pb-4">
                    <h2 className="text-xl font-bold text-white">{t('settings.title')}</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>

                <div className="space-y-6">
                    {/* Notifications Section */}
                    <div className="bg-[#0c0b1e] p-4 rounded-2xl">
                        <h3 className="text-sm font-bold text-gray-300 mb-3">{t('settings.notifications_title')}</h3>
                        
                        {notificationPermission === 'default' && (
                            <button onClick={requestNotificationPermission} className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-xl shadow-md transition-all">
                                {t('settings.enable_notifications')}
                            </button>
                        )}
                        
                        {notificationPermission === 'denied' && (
                            <p className="text-center text-xs text-yellow-400 bg-yellow-900/30 p-2 rounded-xl border border-yellow-700/30">
                                {t('settings.notifications_denied')}
                            </p>
                        )}

                        {notificationPermission === 'granted' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-gray-400">{t('settings.trade_closed_notifications')}</label>
                                    <Toggle enabled={notificationSettings.tradeClosed} onChange={(val) => handleSettingChange('tradeClosed', val)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-gray-400">{t('settings.weekly_summary_notifications')}</label>
                                    <Toggle enabled={notificationSettings.weeklySummary} onChange={(val) => handleSettingChange('weeklySummary', val)} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Language Section */}
                    <div className="bg-[#0c0b1e] p-4 rounded-2xl">
                        <h3 className="text-sm font-bold text-gray-300 mb-3">{t('settings.language')}</h3>
                         <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as 'en' | 'fr')}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-cyan-500 focus:border-cyan-500 transition text-sm appearance-none"
                        >
                            <option value="en">{t('settings.english')}</option>
                            <option value="fr">{t('settings.french')}</option>
                        </select>
                    </div>

                    {/* Disconnect Section */}
                    <button 
                        onClick={() => {
                            onLogout();
                            onClose(); 
                        }}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 font-bold rounded-2xl border border-red-900/50 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t('settings.sign_out')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
