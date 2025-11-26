
import { useState, useEffect } from 'react';
import { Trade, AppView } from '../types';
import { parseCSV } from '../utils/csvParser';

interface UsePWAProps {
    setView: (view: AppView) => void;
    setAddAccountModalOpen: (isOpen: boolean) => void;
    setModalMode: (mode: 'add' | 'update') => void;
}

export const usePWA = ({ setView, setAddAccountModalOpen, setModalMode }: UsePWAProps) => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [launchedFileContent, setLaunchedFileContent] = useState<{trades: Trade[], fileName: string} | null>(null);
    const [pwaError, setPwaError] = useState<string | null>(null);

    useEffect(() => {
        // 1. Register periodic background sync
        const registerPeriodicSync = async () => {
            const registration = await navigator.serviceWorker.ready;
            try {
                // @ts-ignore
                await registration.periodicSync.register('account-sync', {
                    minInterval: 6 * 60 * 1000, // 6 minutes
                });
                console.log('Periodic sync registered!');
            } catch (e) {
                console.error('Periodic background sync could not be registered.', e);
            }
        };
        
        if ('serviceWorker' in navigator && 'PeriodicSyncManager' in window) {
            registerPeriodicSync();
        }

        // 2. Handle PWA installation prompt events
        const beforeInstallHandler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        const appInstalledHandler = () => {
            setInstallPrompt(null);
        };
        
        window.addEventListener('beforeinstallprompt', beforeInstallHandler);
        window.addEventListener('appinstalled', appInstalledHandler);

        // 3. Handle navigation from app shortcuts
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view') as AppView;
        if (viewParam && ['dashboard', 'trades', 'calendar', 'goals', 'profile'].includes(viewParam)) {
            setView(viewParam);
        }

        // 4. Handle file open events
        if ('launchQueue' in window) {
            (window as any).launchQueue.setConsumer(async (launchParams: { files: any[] }) => {
                if (!launchParams.files || launchParams.files.length === 0) return;
                try {
                    const fileHandle = launchParams.files[0];
                    const file = await fileHandle.getFile();
                    const content = await file.text();
                    const trades = parseCSV(content);
                    setLaunchedFileContent({ trades, fileName: file.name });
                    setModalMode('add');
                    setAddAccountModalOpen(true);
                } catch (e) {
                    setPwaError(e instanceof Error ? e.message : 'Failed to handle launched file.');
                }
            });
        }
        
        return () => {
            window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
            window.removeEventListener('appinstalled', appInstalledHandler);
        };
    }, [setView, setAddAccountModalOpen, setModalMode]);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
            if (choiceResult.outcome === 'accepted') {
                setInstallPrompt(null);
            }
        });
    };

    return {
        installPrompt,
        launchedFileContent,
        pwaError,
        setLaunchedFileContent,
        setPwaError,
        handleInstallClick
    };
};
