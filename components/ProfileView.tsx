import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import GoogleDriveBackup from './GoogleDriveBackup';
import { NotificationSettings, NotificationItem } from '../types';
import Toggle from './Toggle';

interface ProfileViewProps {
    canInstall: boolean;
    onInstallClick: () => void;
    notificationSettings: NotificationSettings;
    onNotificationSettingsChange: (settings: NotificationSettings) => void;
    notificationHistory: NotificationItem[];
    onClearNotifications: () => void;
}

const NotificationCenter: React.FC<{ history: NotificationItem[]; onClear: () => void }> = ({ history, onClear }) => {
    const { t, language } = useLanguage();

    const formatTimeAgo = (timestamp: number): string => {
        const now = new Date();
        const seconds = Math.round((now.getTime() - timestamp) / 1000);
        const minutes = Math.round(seconds / 60);
        const hours = Math.round(minutes / 60);
        const days = Math.round(hours / 24);

        if (seconds < 60) return `${seconds}s ago`;
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="p-4 bg-[#0c0b1e] rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-300">{t('profile.notification_center_title')}</h3>
                {history.length > 0 && (
                    <button onClick={onClear} className="text-sm text-cyan-400 hover:text-cyan-300">
                        {t('profile.clear_all')}
                    </button>
                )}
            </div>
            <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                {history.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">{t('profile.no_notifications')}</p>
                ) : (
                    history.map(item => (
                        <div key={item.id} className="p-3 bg-gray-800/50 rounded-md">
                            <div className="flex justify-between items-start">
                                <p className="font-semibold text-white text-sm">{item.title}</p>
                                <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatTimeAgo(item.timestamp)}</p>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{item.body}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};


const ProfileView: React.FC<ProfileViewProps> = ({ canInstall, onInstallClick, notificationSettings, onNotificationSettingsChange, notificationHistory, onClearNotifications }) => {
    const { language, setLanguage, t } = useLanguage();
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

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
        }
    };

    const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
        if (notificationPermission !== 'granted') {
            requestNotificationPermission();
        } else {
            onNotificationSettingsChange({ ...notificationSettings, [key]: value });
        }
    };

    return (
        <div className="bg-[#16152c] p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-700/50">
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-white text-center">{t('profile.title')}</h2>
            </header>
            
            <div className="max-w-md mx-auto space-y-8">
                {/* NOTIFICATIONS */}
                <div className="p-4 bg-[#0c0b1e] rounded-lg">
                    <h3 className="text-lg font-medium text-gray-300 mb-2 text-center">{t('profile.notifications_title')}</h3>
                    <p className="text-sm text-gray-400 mb-4 text-center">{t('profile.notifications_description')}</p>
                    
                    {notificationPermission === 'default' && (
                        <button onClick={requestNotificationPermission} className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105">
                            {t('profile.enable_notifications')}
                        </button>
                    )}

                    {notificationPermission === 'denied' && (
                        <p className="text-center text-sm text-yellow-400 bg-yellow-900/50 p-3 rounded-md">{t('profile.notifications_denied')}</p>
                    )}

                    {notificationPermission === 'granted' && (
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
                    )}
                </div>
                
                {/* NOTIFICATION CENTER */}
                <NotificationCenter history={notificationHistory} onClear={onClearNotifications} />

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