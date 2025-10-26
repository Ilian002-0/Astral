import React, { useState, useEffect } from 'react';
import { Trade, Account } from '../types';
import FileUpload from './FileUpload';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import { parseCSV } from '../utils/csvParser';

interface AddAccountProps {
    onSaveAccount: (account: { name: string, trades: Trade[], initialBalance: number, currency: 'USD' | 'EUR', dataUrl?: string }, mode: 'add' | 'update') => void;
    onClose: () => void;
    isOpen: boolean;
    mode: 'add' | 'update';
    accountToUpdate?: Account | null;
    launchedFileContent?: {trades: Trade[], fileName: string} | null;
    onLaunchedFileConsumed: () => void;
}

const AddAccountModal: React.FC<AddAccountProps> = ({ onSaveAccount, onClose, isOpen, mode, accountToUpdate, launchedFileContent, onLaunchedFileConsumed }) => {
    const { t } = useLanguage();
    useLockBodyScroll(isOpen);
    const [accountName, setAccountName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD');
    const [allTradesFromFile, setAllTradesFromFile] = useState<Trade[] | null>(null);
    const [newTradesCount, setNewTradesCount] = useState<number | null>(null);
    const [updatedTradesCount, setUpdatedTradesCount] = useState<number | null>(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sourceType, setSourceType] = useState<'file' | 'url'>('file');
    const [dataUrl, setDataUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const resetState = () => {
        setAccountName('');
        setInitialBalance('');
        setCurrency('USD');
        setAllTradesFromFile(null);
        setNewTradesCount(null);
        setUpdatedTradesCount(null);
        setFileName('');
        setError(null);
        setSourceType('file');
        setDataUrl('');
        setIsSaving(false);
    };
    
    useEffect(() => {
        if (isOpen) {
            setIsSaving(false);
            if (launchedFileContent) {
                handleFileProcessed(launchedFileContent.trades, launchedFileContent.fileName);
                onLaunchedFileConsumed();
            } else if (mode === 'update' && accountToUpdate) {
                setAccountName(accountToUpdate.name);
                setInitialBalance(String(accountToUpdate.initialBalance));
                setCurrency(accountToUpdate.currency || 'USD');
                if (accountToUpdate.dataUrl) {
                    setSourceType('url');
                    setDataUrl(accountToUpdate.dataUrl);
                } else {
                    setSourceType('file');
                    setDataUrl('');
                }
            } else {
                resetState();
            }
        }
    }, [isOpen, mode, accountToUpdate, launchedFileContent, onLaunchedFileConsumed]);
    
    const handleFileProcessed = (trades: Trade[], name: string) => {
        setAllTradesFromFile(trades);
        setFileName(name);
        setError(null);

        if (mode === 'update' && accountToUpdate) {
            const existingTickets = new Set(accountToUpdate.trades.map(t => t.ticket));
            const newTrades = trades.filter(t => !existingTickets.has(t.ticket));
            const updatedTrades = trades.filter(t => existingTickets.has(t.ticket));
            setNewTradesCount(newTrades.length);
            setUpdatedTradesCount(updatedTrades.length);
        }
    };
    
    const handleClearFile = () => {
        setAllTradesFromFile(null);
        setFileName('');
        setNewTradesCount(null);
        setUpdatedTradesCount(null);
    };
    
    const handleSave = async () => {
        const balance = parseFloat(initialBalance);
        if (!accountName.trim()) {
            setError("Account name is required.");
            return;
        }
        if (isNaN(balance) || balance < 0) {
            setError("Initial balance must be a valid positive number.");
            return;
        }

        if (isSaving) return;
        setIsSaving(true);
        setError(null);

        try {
            let tradesToSave: Trade[] = allTradesFromFile || [];
            
            // This is the critical bug fix: when adding a new account via URL,
            // we must fetch the data first before calling onSaveAccount.
            if (mode === 'add' && sourceType === 'url') {
                if (!dataUrl.trim()) {
                    setError("Please provide a valid URL for the CSV file.");
                    setIsSaving(false);
                    return;
                }
                const response = await fetch(dataUrl.trim(), { cache: 'reload' });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const csvText = await response.text();
                tradesToSave = parseCSV(csvText);
            } else if (sourceType === 'file' && !allTradesFromFile) {
                 setError("Please upload a CSV file with your trade history.");
                 setIsSaving(false);
                 return;
            } else if (sourceType === 'url' && mode === 'update' && !dataUrl.trim()){
                 setError("Please provide a valid URL for the CSV file.");
                 setIsSaving(false);
                 return;
            }

            onSaveAccount({
                name: accountName.trim(),
                trades: tradesToSave,
                initialBalance: balance,
                currency: currency,
                dataUrl: sourceType === 'url' ? dataUrl.trim() : undefined,
            }, mode);
            // Success: App.tsx will close the modal, no need to setIsSaving(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.fetch_failed'));
            setIsSaving(false); // Error: stop loading and show message
        }
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={handleClose}>
            <div
                className="w-full max-w-lg p-4 sm:p-6 bg-[#16152c] border border-gray-700/50 rounded-2xl shadow-2xl animate-fade-in-scale-up max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center pb-4 border-b border-gray-700">
                    <div>
                        <h2 className="text-modal-title font-bold text-white">
                            {mode === 'add' ? t('add_account_modal.title') : t('add_account_modal.title_update')}
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            {mode === 'add' ? t('add_account_modal.subtitle') : t('add_account_modal.subtitle_update')}
                        </p>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
                </header>

                <div className="overflow-y-auto flex-grow my-6 pr-2 space-y-6">
                    {error && <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded-lg text-center text-sm">{error}</div>}

                    <div>
                        <label htmlFor="accountName" className="block text-sm font-medium text-gray-300 mb-2">{t('add_account_modal.account_name')}</label>
                        <input
                            type="text"
                            id="accountName"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            placeholder={t('add_account_modal.account_name_placeholder')}
                            className="w-full px-4 py-2 bg-[#0c0b1e] border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
                            disabled={mode === 'update'}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-300 mb-2">{t('add_account_modal.initial_balance', { currency })}</label>
                            <input
                                type="number"
                                id="initialBalance"
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(e.target.value)}
                                placeholder={t('add_account_modal.initial_balance_placeholder')}
                                className="w-full px-4 py-2 bg-[#0c0b1e] border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
                             <div className="flex h-[42px]">
                                <button onClick={() => setCurrency('USD')} className={`flex-1 rounded-l-lg ${currency === 'USD' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>USD</button>
                                <button onClick={() => setCurrency('EUR')} className={`flex-1 rounded-r-lg ${currency === 'EUR' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>EUR</button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('add_account_modal.data_source')}</label>
                        <div className="flex bg-gray-700 rounded-lg p-1">
                            <button onClick={() => setSourceType('file')} className={`flex-1 py-1 rounded-md text-sm transition-colors ${sourceType === 'file' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-600'}`}>{t('add_account_modal.file_upload')}</button>
                            <button onClick={() => setSourceType('url')} className={`flex-1 py-1 rounded-md text-sm transition-colors ${sourceType === 'url' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-600'}`}>{t('add_account_modal.live_url')}</button>
                        </div>
                    </div>

                    {sourceType === 'file' ? (
                         <>
                            {!allTradesFromFile && <FileUpload onFileProcessed={handleFileProcessed} onError={setError} />}
                            {allTradesFromFile && (
                                <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <p className="font-semibold text-white">{t('add_account_modal.file_loaded')}</p>
                                    <p className="text-cyan-400">{fileName}</p>
                                    <p className="text-gray-300 mt-2">{t('add_account_modal.trades_found', { count: allTradesFromFile.length })}</p>
                                    {mode === 'update' && newTradesCount !== null && updatedTradesCount !== null && (
                                        <>
                                            <p className="text-sm text-green-400">{t('add_account_modal.trades_to_add', { count: newTradesCount })}</p>
                                            <p className="text-sm text-yellow-400">{t('add_account_modal.trades_updated', { count: updatedTradesCount })}</p>
                                        </>
                                    )}
                                    <button onClick={handleClearFile} className="mt-4 text-sm text-red-400 hover:text-red-300">{t('add_account_modal.clear_file')}</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div>
                            <label htmlFor="dataUrl" className="block text-sm font-medium text-gray-300 mb-2">{t('add_account_modal.csv_url')}</label>
                            <input
                                type="url"
                                id="dataUrl"
                                value={dataUrl}
                                onChange={(e) => setDataUrl(e.target.value)}
                                placeholder={t('add_account_modal.csv_url_placeholder')}
                                className="w-full px-4 py-2 bg-[#0c0b1e] border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
                            />
                            <p className="text-xs text-gray-500 mt-2">{t('add_account_modal.url_helper_text')}</p>
                        </div>
                    )}
                </div>

                <footer className="pt-4 border-t border-gray-700">
                    <div className="flex justify-end gap-4">
                        <button onClick={handleClose} className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
                            {t('common.cancel')}
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isSaving ? 'Saving...' : (mode === 'add' ? t('add_account_modal.save_button') : t('add_account_modal.save_button_update'))}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AddAccountModal;