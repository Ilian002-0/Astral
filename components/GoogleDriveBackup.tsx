import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const GoogleDriveBackup: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="text-center">
      <p className="text-sm text-gray-400 mb-4">{t('profile.backup_description')}</p>
      <button
        disabled={true}
        className="w-full px-6 py-3 text-white font-bold rounded-lg shadow-md bg-gray-600 cursor-not-allowed opacity-50"
        aria-label={t('profile.feature_coming_soon')}
      >
        {t('profile.connect_google')}
      </button>
      <p className="text-gray-500 text-xs mt-3">{t('profile.feature_coming_soon')}</p>
    </div>
  );
};

export default GoogleDriveBackup;