import React, { useState, useEffect } from 'react';
import { Trade, Account } from '../types';
import FileUpload from './FileUpload';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

interface AddAccountProps {
    onSaveAccount: (account: { name: string, trades: Trade[], initialBalance: number, dataUrl?: string }, mode: 'add' | 'update') => void;
    onClose: () => void;
    isOpen: boolean;
    mode: 'add' | 'update';
    accountToUpdate?: Account | null;
}

const AddAccountModal: React.FC<AddAccountProps> = ({ onSaveAccount, onClose, isOpen, mode, accountToUpdate }) => {
    const { t } = useLanguage();
    useLockBodyScroll(isOpen);
    const [accountName, setAccountName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [allTradesFromFile, setAllTradesFromFile] = useState<Trade[] | null>(null);
    const [newTradesCount, setNewTradesCount] = useState<number | null>(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sourceType, setSourceType] = useState<'file' | 'url'>('file');
    const [dataUrl, setDataUrl] = useState('');

    const resetState = () => {
        setAccountName('');
        setInitialBalance('');
        setAllTradesFromFile(null);
        setNewTradesCount(null);
        setFileName('');
        setError(null);
        setSourceType('file');
        setDataUrl('');
    };

    useEffect(() => {
        if (isOpen) {
            if (mode === 'update' && accountToUpdate) {
                setAccountName(accountToUpdate.name);
                setInitialBalance(String(accountToUpdate.initialBalance));
                if (accountToUpdate.dataUrl) {
                    setSourceType('url');
                    setDataUrl(accountToUpdate.dataUrl);
                } else {
                    setSourceType('file');
                }
            }
        } else {
            setTimeout(resetState, 300);
        }
    }, [isOpen, mode, accountToUpdate]);

    const handleFileProcessed = (data: Trade[], name: string) => {
        setAllTradesFromFile(data);
        setFileName(name);
        setError(null);
        if (mode === 'update' && accountToUpdate) {
            const existingTicketIds = new Set(accountToUpdate.trades.map(t => t.ticket));
            setNewTradesCount(data.filter(t => !existingTicketIds.has(t.ticket)).length);
        }
    };

    const handleFileError = (errorMessage: string) => {
        setAllTradesFromFile(null);
        setFileName('');
        setError(errorMessage);
    };

    const handleSave = () => {
        const isUrlMode = sourceType === 'url';
        if (accountName.trim() && initialBalance && (isUrlMode ? dataUrl.trim() : allTradesFromFile)) {
            onSaveAccount({
                name: accountName.trim(),
                trades: allTradesFromFile || [], // Pass empty if URL mode, it will be fetched later
                initialBalance: parseFloat(initialBalance),
                dataUrl: isUrlMode ? dataUrl.trim() : undefined,
            }, mode);
        }
    };
    
    const isSaveDisabled = !accountName.trim() || !initialBalance || parseFloat(initialBalance) < 0 || (sourceType === 'file' && !allTradesFromFile) || (sourceType === 'url' && !dataUrl.trim());

    if (!isOpen) return null;

    const isUpdateMode = mode === 'update';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50" onClick={onClose}>
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] sm:w-full max-w-2xl p-6 sm:p-8 bg-[#16152c] border border-gray-700/50 rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto" 
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white">{t(isUpdateMode ? 'add_account_modal.title_update' : 'add_account_modal.title')}</h2>
                    <p className="text-gray-400 mt-2">{t(isUpdateMode ? 'add_account_modal.subtitle_update' : 'add_account_modal.subtitle')}</p>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="accountName" className="block text-sm font-medium text-gray-300 mb-2">{t('add_account_modal.account_name')}</label>
                            <input type="text" id="accountName" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder={t('add_account_modal.account_name_placeholder')} className="w-full px-4 py-2 bg-[#0c0b1e] border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-800 disabled:text-gray-400" disabled={isUpdateMode}/>
                        </div>
                        <div>
                            <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-300 mb-2">{t('add_account_modal.initial_balance')}</label>
                            <input type="number" id="initialBalance" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder={t('add_account_modal.initial_balance_placeholder')} className="w-full px-4 py-2 bg-[#0c0b1e] border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition"/>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('add_account_modal.data_source')}</label>
                        <div className="flex rounded-lg bg-[#0c0b1e] border border-gray-600 p-1">
                            <button onClick={() => setSourceType('file')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition ${sourceType === 'file' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>{t('add_account_modal.file_upload')}</button>
                            <button onClick={() => setSourceType('url')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition ${sourceType === 'url' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>{t('add_account_modal.live_url')}</button>
                        </div>
                    </div>
                    
                    {sourceType === 'file' ? (
                        fileName ? (
                            <div className="p-4 bg-[#0c0b1e]/50 rounded-lg border border-gray-700 text-center">
                                <p className="text-gray-300">{t('add_account_modal.file_loaded')}</p>
                                <p className="font-semibold text-cyan-400">{fileName}</p>
                                <p className="text-sm text-gray-400 mt-1">{isUpdateMode ? t('add_account_modal.trades_to_add', { count: newTradesCount ?? 0 }) : t('add_account_modal.trades_found', { count: allTradesFromFile?.length || 0 })}</p>
                                <button onClick={() => { setAllTradesFromFile(null); setFileName(''); setNewTradesCount(null); }} className="text-xs text-red-400 hover:text-red-300 mt-2">{t('add_account_modal.clear_file')}</button>
                            </div>
                        ) : (
                            <FileUpload onFileProcessed={handleFileProcessed} onError={handleFileError} />
                        )
                    ) : (
                        <div>
                            <label htmlFor="dataUrl" className="block text-sm font-medium text-gray-300 mb-2">{t('add_account_modal.csv_url')}</label>
                            <input type="url" id="dataUrl" value={dataUrl} onChange={(e) => setDataUrl(e.target.value)} placeholder={t('add_account_modal.csv_url_placeholder')} className="w-full px-4 py-2 bg-[#0c0b1e] border border-gray-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500 transition"/>
                            <p className="text-xs text-gray-500 mt-2">{t('add_account_modal.url_helper_text')}</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-center text-sm">
                            <strong>{t('common.error')}:</strong> {error}
                        </div>
                    )}
                </div>
                
                <div className="flex justify-center items-center space-x-4 mt-8">
                    <button onClick={onClose} className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105">{t('common.cancel')}</button>
                    <button onClick={handleSave} disabled={isSaveDisabled} className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed disabled:transform-none">{t(isUpdateMode ? 'add_account_modal.save_button_update' : 'add_account_modal.save_button')}</button>
                </div>
            </div>
        </div>
    );
};

export default AddAccountModal;