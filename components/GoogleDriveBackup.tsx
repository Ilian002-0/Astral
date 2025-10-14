import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// Add the google object to the window interface to prevent TypeScript errors
declare global {
  interface Window {
    google: any;
  }
}

// Assume the Google Client ID is available as an environment variable
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const DRIVE_API_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const GoogleDriveBackup: React.FC = () => {
  const { t } = useLanguage();
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gdriveAccessToken, setGdriveAccessToken] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const isConfigured = !!CLIENT_ID;

  const initTokenClient = useCallback(() => {
    // Only initialize if the client ID is configured and the Google library is loaded.
    if (isConfigured && window.google) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: DRIVE_API_SCOPE,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            setErrorMessage(tokenResponse.error);
            setBackupStatus('error');
          } else {
            setGdriveAccessToken(tokenResponse.access_token);
            setBackupStatus('idle'); // Reset status on new token
          }
        },
      });
      setTokenClient(client);
    }
  }, [isConfigured]);

  useEffect(() => {
    // If not configured, do nothing.
    if (!isConfigured) return;

    // GIS library is loaded asynchronously, so we poll for it.
    const checkGoogle = setInterval(() => {
      if (window.google) {
        clearInterval(checkGoogle);
        initTokenClient();
      }
    }, 100);

    return () => clearInterval(checkGoogle);
  }, [isConfigured, initTokenClient]);

  const createBackupData = (): Blob => {
    const backupData: { [key: string]: any } = {};
    const keysToBackup = ['trading_accounts_v1', 'current_account_v1', 'trades_list_columns_v1', 'app_language'];
    
    keysToBackup.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          // Attempt to parse as JSON, but store as string if it fails
          backupData[key] = JSON.parse(data);
        } catch (e) {
          backupData[key] = data;
        }
      }
    });

    const jsonString = JSON.stringify(backupData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  };
  
  const uploadToDrive = async () => {
    if (!gdriveAccessToken) {
      setErrorMessage('Authentication token is missing.');
      setBackupStatus('error');
      return;
    }
    
    setBackupStatus('loading');
    setErrorMessage(null);

    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const fileName = `Atlas_Backup_${timestamp}.json`;

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: ['appDataFolder'] // Use 'appDataFolder' for app-private storage
    };

    const fileContent = createBackupData();
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', fileContent);
    
    try {
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gdriveAccessToken}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Failed to upload file.');
      }
      
      setBackupStatus('success');
      setTimeout(() => setBackupStatus('idle'), 5000); // Reset after 5s
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
      setBackupStatus('error');
    }
  };

  const handleAuthClick = () => {
    if (tokenClient) {
      if (gdriveAccessToken) {
        uploadToDrive();
      } else {
        tokenClient.requestAccessToken();
      }
    } else {
      setErrorMessage(t('profile.backup_no_client_id'));
      setBackupStatus('error');
    }
  };

  if (!isConfigured) {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-400 mb-4">{t('profile.backup_description')}</p>
        <button
          disabled={true}
          className="w-full px-6 py-3 text-white font-bold rounded-lg shadow-md bg-gray-600 cursor-not-allowed opacity-50"
          aria-label={t('profile.backup_no_client_id')}
        >
          {t('profile.connect_google')}
        </button>
        <p className="text-yellow-500 text-xs mt-3">{t('profile.backup_no_client_id')}</p>
      </div>
    );
  }

  const renderButtonContent = () => {
    switch (backupStatus) {
      case 'loading':
        return t('profile.backup_loading');
      case 'success':
        return t('profile.backup_success');
      case 'error':
        return t('profile.backup_retry');
      default:
        return gdriveAccessToken ? t('profile.backup_button') : t('profile.connect_google');
    }
  };
  
  const buttonClasses = `w-full px-6 py-3 text-white font-bold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed
    ${backupStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : 
      backupStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : 
      'bg-blue-600 hover:bg-blue-700'
    }`;

  return (
    <div className="text-center">
      <p className="text-sm text-gray-400 mb-4">{t('profile.backup_description')}</p>
      <button
        onClick={handleAuthClick}
        disabled={!tokenClient || backupStatus === 'loading'}
        className={buttonClasses}
      >
        {renderButtonContent()}
      </button>
      {errorMessage && (
        <p className="text-red-400 text-sm mt-4">{t('common.error')}: {errorMessage}</p>
      )}
    </div>
  );
};

export default GoogleDriveBackup;