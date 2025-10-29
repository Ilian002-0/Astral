import { Trade } from '../types';

export const parseCSV = (content: string): Trade[] => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) throw new Error("CSV/TSV file must have a header and at least one data row.");
    
    const headerLine = lines[0];
    const separator = headerLine.includes('\t') ? '\t' : ',';

    const header = headerLine.split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const requiredHeaders = ['order', 'open time', 'type', 'profit'];
    const hasAllHeaders = requiredHeaders.every(reqHeader => header.includes(reqHeader));

    if (!hasAllHeaders) {
        throw new Error("CSV file is missing one or more required columns. At least expected: Order, Open Time, Type, Profit.");
    }

    const colMap: { [key: string]: number } = {};
    header.forEach((h, i) => {
      if (h === 'order' || h === 'ticket') colMap['ticket'] = i;
      if (h === 'open time') colMap['openTime'] = i;
      if (h === 'type') colMap['type'] = i;
      if (h === 'volume' || h === 'size') colMap['size'] = i;
      if (h === 'symbol') colMap['symbol'] = i;
      if (h === 'open price') colMap['openPrice'] = i;
      if (h === 'close time') colMap['closeTime'] = i;
      if (h === 'close price') colMap['closePrice'] = i;
      if (h === 'commission') colMap['commission'] = i;
      if (h === 'swap') colMap['swap'] = i;
      if (h === 'profit') colMap['profit'] = i;
      if (h === 'comment') colMap['comment'] = i;
    });
    
    const parseDecimal = (value: string | undefined): number => {
        if (typeof value !== 'string' || value.trim() === '') {
            return 0;
        }
        // Remove quotes and whitespace, then replace comma with dot for float parsing
        const cleanedValue = value.replace(/"/g, '').trim().replace(',', '.');
        return parseFloat(cleanedValue);
    };

    return lines.slice(1).map(line => {
      // Use a regex for CSV that handles quoted fields containing commas.
      // For TSV, a simple split is sufficient as it doesn't typically use quoting.
      const separatorRegex = separator === ',' ? /,(?=(?:(?:[^"]*"){2})*[^"]*$)/ : /\t/;
      const data = line.split(separatorRegex);
      
      if (data.length <= Math.max(...Object.values(colMap))) {
        return null;
      }
      
      const getCleanString = (index: number) => (data[index] || '').trim().replace(/"/g, '');
      const type = getCleanString(colMap['type']);
      const profit = parseDecimal(data[colMap['profit']]);
      
      const parseMT5Date = (dateStr: string) => {
        if (!dateStr || dateStr.trim() === '') return new Date(0); // Return epoch for invalid dates
        return new Date(dateStr.replace(/"/g, '').replace(/\./g, '-').trim());
      };

      if (type === 'balance') {
        const opTime = parseMT5Date(data[colMap['openTime']]);
        if (isNaN(opTime.getTime()) || opTime.getTime() === 0) return null; // Skip if date is invalid

        return {
          ticket: parseInt(getCleanString(colMap['ticket']), 10) || opTime.getTime(), // Use timestamp as fallback ticket
          openTime: opTime,
          type: 'balance',
          size: 0,
          symbol: 'Balance', // Use a clear identifier
          openPrice: 0,
          closeTime: opTime,
          closePrice: 1, // Sentinel to ensure it's processed as a "closed" operation
          commission: 0,
          swap: 0,
          profit: profit,
          comment: getCleanString(colMap['comment']) || (profit > 0 ? 'Deposit' : 'Withdrawal')
        };
      }

      if (isNaN(profit)) return null;

      return {
        ticket: parseInt(getCleanString(colMap['ticket']), 10),
        openTime: parseMT5Date(data[colMap['openTime']]),
        type: getCleanString(colMap['type']),
        size: parseDecimal(data[colMap['size']]),
        symbol: getCleanString(colMap['symbol']),
        openPrice: parseDecimal(data[colMap['openPrice']]),
        closeTime: parseMT5Date(data[colMap['closeTime']]),
        closePrice: parseDecimal(data[colMap['closePrice']]),
        commission: parseDecimal(data[colMap['commission']]),
        swap: parseDecimal(data[colMap['swap']]),
        profit: profit,
        comment: colMap['comment'] !== undefined ? getCleanString(colMap['comment']) : ''
      };
    }).filter((trade): trade is Trade => trade !== null && !isNaN(trade.ticket) && trade.openTime instanceof Date && !isNaN(trade.openTime.getTime()) && trade.openTime.getTime() !== 0 && trade.closeTime instanceof Date && !isNaN(trade.closeTime.getTime()) && trade.closeTime.getTime() !== 0);
  };
