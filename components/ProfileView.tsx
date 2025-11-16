
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import GoogleDriveBackup from './GoogleDriveBackup';
import { NotificationSettings } from '../types';
import Toggle from './Toggle';


interface ProfileViewProps {
    canInstall: boolean;
    onInstallClick: () => void;
    notificationSettings: NotificationSettings;
    onNotificationSettingsChange: (settings: NotificationSettings) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ canInstall, onInstallClick, notificationSettings, onNotificationSettingsChange }) => {
    const { language, setLanguage, t } = useLanguage();
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [isNotificationsExpanded, setIsNotificationsExpanded] = useState(false);

    const handleUpdate = () => {
        window.location.reload();
    };

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
            // Automatically enable all notifications on first grant
            onNotificationSettingsChange({ tradeClosed: true, weeklySummary: true });
            setIsNotificationsExpanded(true);
        }
    };

    const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
        if (notificationPermission !== 'granted') {
            requestNotificationPermission();
        } else {
            onNotificationSettingsChange({ ...notificationSettings, [key]: value });
        }
    };

    const handleTestNotification = async () => {
        if (!('serviceWorker' in navigator)) {
            alert('Service Worker not supported. Notifications cannot be sent.');
            return;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('Atlas Test Notification', {
                body: 'If you see this, notifications are working!',
                icon: 'https://i.imgur.com/gA2QYp9.png',
                badge: 'https://i.imgur.com/zW6T5bB.png',
                data: {
                    url: `${window.location.origin}/?view=profile`
                }
            });
        } catch (e) {
            console.error('Error showing test notification:', e);
            alert('Failed to show test notification. Check console for details.');
        }
    };

    const ChevronDownIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
    );

    return (
        <div className="bg-[#16152c] p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-700/50">
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-white text-center">{t('profile.title')}</h2>
            </header>
            
            <div className="max-w-md mx-auto space-y-8">
                {/* NOTIFICATIONS COLLAPSIBLE */}
                <div className="bg-[#0c0b1e] rounded-lg">
                    <button 
                        className="w-full flex justify-between items-center p-4 text-left"
                        onClick={() => setIsNotificationsExpanded(prev => !prev)}
                        aria-expanded={isNotificationsExpanded}
                    >
                        <h3 className="text-lg font-medium text-gray-300">{t('profile.notifications_title')}</h3>
                        <span className={`transition-transform duration-300 ${isNotificationsExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDownIcon />
                        </span>
                    </button>
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isNotificationsExpanded ? 'max-h-96' : 'max-h-0'}`}>
                        <div className="px-4 pb-4 border-t border-gray-800">
                            <p className="text-sm text-gray-400 my-4 text-center">{t('profile.notifications_description')}</p>
                    
                            {notificationPermission === 'default' && (
                                <button onClick={requestNotificationPermission} className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105">
                                    {t('profile.enable_notifications')}
                                </button>
                            )}

                            {notificationPermission === 'denied' && (
                                <p className="text-center text-sm text-yellow-400 bg-yellow-900/50 p-3 rounded-md">{t('profile.notifications_denied')}</p>
                            )}

                            {notificationPermission === 'granted' && (
                                <>
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-gray-300">{t('profile.trade_closed_notifications')}</label>
                                            <Toggle enabled={notificationSettings.tradeClosed} onChange={(val) => handleSettingChange('tradeClosed', val)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label className="text-gray-300">{t('profile.weekly_summary_notifications')}</label>
                                            <Toggle enabled={notificationSettings.weeklySummary} onChange={(val) => handleSettingChange('weeklySummary', val)} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3 text-center italic">
                                        {t('profile.background_sync_note')}
                                    </p>
                                    <button onClick={handleTestNotification} className="w-full mt-4 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105">
                                        {t('profile.send_test_notification')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* INSTALL APP */}
                {canInstall && (
                    <div className="p-4 bg-[#0c0b1e] rounded-lg text-center">
                        <h3 className="text-lg font-medium text-gray-300 mb-2">Install App</h3>
                        <p className="text-sm text-gray-400 mb-4">Get the best experience by installing the app on your device.</p>
                        <button
                            onClick={onInstallClick}
                            className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105"
                        >
                            Install Atlas
                        </button>
                    </div>
                )}
                
                {/* UPDATE APP */}
                <div className="p-4 bg-[#0c0b1e] rounded-lg">
                    <h3 className="text-lg font-medium text-gray-300 mb-2 text-center">{t('profile.update_title')}</h3>
                    <p className="text-sm text-gray-400 mb-4 text-center">{t('profile.update_description')}</p>
                    <button
                        onClick={handleUpdate}
                        className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105"
                    >
                        {t('profile.update_button')}
                    </button>
                </div>

                {/* LANGUAGE */}
                <div className="flex items-center justify-between p-4 bg-[#0c0b1e] rounded-lg">
                    <label htmlFor="language-select" className="text-lg font-medium text-gray-300">
                        {t('profile.language')}
                    </label>
                    <select
                        id="language-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'en' | 'fr')}
                        className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
                    >
                        <option value="en">{t('profile.english')}</option>
                        <option value="fr">{t('profile.french')}</option>
                    </select>
                </div>
                
                {/* BACKUP */}
                <div className="p-4 bg-[#0c0b1e] rounded-lg">
                    <h3 className="text-lg font-medium text-gray-300 mb-4 text-center">{t('profile.backup_title')}</h3>
                    <GoogleDriveBackup />
                </div>

                <div className="text-center text-gray-500 text-sm pt-4 border-t border-gray-700/50">
                    <p>{t('profile.free_to_use')}</p>
                    <p>{t('profile.data_privacy')}</p>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;