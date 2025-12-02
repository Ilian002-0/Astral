import React, { Suspense, useMemo } from 'react';
import { Account, ProcessedData, Trade } from '../types';
import { getDayIdentifier } from '../utils/calendar';

// Lazy Load Modals
const AddAccountModal = React.lazy(() => import('./AddAccount'));
const AccountActionModal = React.lazy(() => import('./AccountActionModal'));
const DayDetailModal = React.lazy(() => import('./DayDetailModal'));
const DeleteConfirmationModal = React.lazy(() => import('./DeleteConfirmationModal'));

interface AppModalsProps {
    isAddAccountModalOpen: boolean;
    setAddAccountModalOpen: (isOpen: boolean) => void;
    isAccountActionModalOpen: boolean;
    setAccountActionModalOpen: (isOpen: boolean) => void;
    isDeleteConfirmModalOpen: boolean;
    setDeleteConfirmModalOpen: (isOpen: boolean) => void;
    modalMode: 'add' | 'update';
    currentAccount: Account | null;
    handleSaveAccountWrapper: (data: any, mode: 'add' | 'update') => void;
    launchedFileContent: { trades: Trade[], fileName: string } | null;
    setLaunchedFileContent: (content: any) => void;
    handleAddClick: () => void;
    handleUpdateClick: () => void;
    handleDeleteClick: () => void;
    handleDeleteWrapper: () => void;
    selectedCalendarDate: Date | null;
    handleCloseDayModal: () => void;
    processedData: ProcessedData | null;
    transitioningDay: string | null;
}

const AppModals: React.FC<AppModalsProps> = ({
    isAddAccountModalOpen,
    setAddAccountModalOpen,
    isAccountActionModalOpen,
    setAccountActionModalOpen,
    isDeleteConfirmModalOpen,
    setDeleteConfirmModalOpen,
    modalMode,
    currentAccount,
    handleSaveAccountWrapper,
    launchedFileContent,
    setLaunchedFileContent,
    handleAddClick,
    handleUpdateClick,
    handleDeleteClick,
    handleDeleteWrapper,
    selectedCalendarDate,
    handleCloseDayModal,
    processedData,
    transitioningDay
}) => {

    const dayDetailModalData = useMemo(() => {
        if (!selectedCalendarDate || !processedData) return null;
        const dateKey = getDayIdentifier(selectedCalendarDate);
        const dailyTrades = processedData.closedTrades.filter(t => getDayIdentifier(t.closeTime) === dateKey);
        if (dailyTrades.length === 0) return null;
        const tradesBefore = processedData.closedTrades.filter(t => t.closeTime.getTime() < dailyTrades[0].closeTime.getTime());
        const startOfDayBalance = (currentAccount?.initialBalance ?? 0) + tradesBefore.reduce((sum, t) => sum + (t.profit + t.commission + t.swap), 0);
        return { trades: dailyTrades, date: selectedCalendarDate, startOfDayBalance };
    }, [selectedCalendarDate, processedData, currentAccount?.initialBalance]);

    return (
        <Suspense fallback={null}>
            <AddAccountModal 
                isOpen={isAddAccountModalOpen} 
                onClose={() => setAddAccountModalOpen(false)} 
                onSaveAccount={handleSaveAccountWrapper}
                mode={modalMode}
                accountToUpdate={currentAccount}
                launchedFileContent={launchedFileContent}
                onLaunchedFileConsumed={() => setLaunchedFileContent(null)}
            />
            <AccountActionModal 
                isOpen={isAccountActionModalOpen}
                onClose={() => setAccountActionModalOpen(false)}
                onAddAccount={handleAddClick}
                onUpdateAccount={handleUpdateClick}
                onDeleteAccount={handleDeleteClick}
                canUpdate={!!currentAccount}
                canDelete={!!currentAccount}
            />
            {dayDetailModalData && (
                <DayDetailModal 
                    isOpen={!!selectedCalendarDate} 
                    onClose={handleCloseDayModal} 
                    {...dayDetailModalData}
                    currency={currentAccount?.currency || 'USD'}
                    transitioningDay={transitioningDay}
                />
            )}
            <DeleteConfirmationModal 
                isOpen={isDeleteConfirmModalOpen}
                onClose={() => setDeleteConfirmModalOpen(false)}
                onConfirm={handleDeleteWrapper}
                accountName={currentAccount?.name || ''}
            />
        </Suspense>
    );
};

export default AppModals;
