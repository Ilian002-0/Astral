import { Trade } from '../types';

export const parseCSV = (content: string): Trade[] => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) throw new Error("CSV/TSV file must have a header and at least one data row.");
    
    const headerLine = lines[0];
    const separator = headerLine.includes('\t') ? '\t' : ',';

    const header = headerLine.split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const requiredHeaders = ['order', 'open time', 'type', 'volume', 'symbol', 'open price', 'close time', 'close price', 'commission', 'swap', 'profit'];
    const hasAllHeaders = requiredHeaders.every(reqHeader => header.includes(reqHeader));

    if (!hasAllHeaders) {
        throw new Error("CSV file is missing one or more required columns. Expected: Order, Open Time, Type, Volume, Symbol, Open Price, Close Time, Close Price, Commission, Swap, Profit.");
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

      const profit = parseDecimal(data[colMap['profit']]);
      if (isNaN(profit)) return null;

      // MT5 date format is often YYYY.MM.DD HH:MM:SS
      const parseMT5Date = (dateStr: string) => {
        if (!dateStr) return new Date();
        return new Date(dateStr.replace(/"/g, '').replace(/\./g, '-').trim());
      };

      const getCleanString = (index: number) => (data[index] || '').trim().replace(/"/g, '');

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
    }).filter((trade): trade is Trade => trade !== null && !isNaN(trade.ticket) && trade.closeTime instanceof Date && !isNaN(trade.closeTime.getTime()));
  };