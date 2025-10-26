import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import GoogleDriveBackup from './GoogleDriveBackup';

interface ProfileViewProps {
    canInstall: boolean;
    onInstallClick: () => void;
    logoUrl: string | null;
    setLogoUrl: (url: string | null) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ canInstall, onInstallClick, logoUrl, setLogoUrl }) => {
    const { language, setLanguage, t } = useLanguage();

    const handleUpdate = () => {
        // A simple page reload. The service worker is configured to check for new content first.
        window.location.reload();
    };
    
    const handleResetLogo = () => {
        setLogoUrl(null);
    };

    return (
        <div className="bg-[#16152c] p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-700/50">
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-white text-center">{t('profile.title')}</h2>
            </header>
            
            <div className="max-w-md mx-auto space-y-8">
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

                <div className="p-4 bg-[#0c0b1e] rounded-lg">
                    <h3 className="text-lg font-medium text-gray-300 mb-2 text-center">{t('profile.custom_logo_title')}</h3>
                    <p className="text-sm text-gray-400 mb-4 text-center">{t('profile.custom_logo_description')}</p>
                    <input
                        type="url"
                        placeholder={t('profile.custom_logo_placeholder')}
                        value={logoUrl || ''}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
                    />
                    {logoUrl && (
                        <button
                            onClick={handleResetLogo}
                            className="w-full mt-2 px-6 py-2 bg-red-800 hover:bg-red-700 text-white font-bold text-sm rounded-lg shadow-md transition-transform transform hover:scale-105"
                        >
                            {t('profile.reset_logo_button')}
                        </button>
                    )}
                </div>
                
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