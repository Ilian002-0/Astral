
import { useMemo } from 'react';
import { Account, ProcessedData } from '../types';
import { processAccountData } from '../utils/calculations';

export const useTradeData = (currentAccount: Account | null) => {
    const processedData: ProcessedData | null = useMemo(() => {
        if (!currentAccount) return null;
        try {
            return processAccountData(currentAccount);
        } catch (e) {
            console.error(e);
            return null;
        }
    }, [currentAccount]);

    return processedData;
};
