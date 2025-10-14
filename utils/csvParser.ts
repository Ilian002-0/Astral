import { Trade } from '../types';

export const parseCSV = (content: string): Trade[] => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) throw new Error("CSV file must have a header and at least one data row.");
    
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
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

    return lines.slice(1).map(line => {
      const data = line.split(',');
      const profit = parseFloat(data[colMap['profit']]);
      
      if (isNaN(profit)) return null;

      // MT5 date format is often YYYY.MM.DD HH:MM:SS
      const parseMT5Date = (dateStr: string) => {
        if (!dateStr) return new Date();
        return new Date(dateStr.replace(/\./g, '-'));
      };

      return {
        ticket: parseInt(data[colMap['ticket']], 10),
        openTime: parseMT5Date(data[colMap['openTime']]),
        type: data[colMap['type']],
        size: parseFloat(data[colMap['size']]),
        symbol: data[colMap['symbol']],
        openPrice: parseFloat(data[colMap['openPrice']]),
        closeTime: parseMT5Date(data[colMap['closeTime']]),
        closePrice: parseFloat(data[colMap['closePrice']]),
        commission: parseFloat(data[colMap['commission']]) || 0,
        swap: parseFloat(data[colMap['swap']]) || 0,
        profit: profit,
        comment: colMap['comment'] !== undefined ? (data[colMap['comment']] || '').trim().replace(/"/g, '') : ''
      };
    }).filter((trade): trade is Trade => trade !== null && trade.closeTime instanceof Date && !isNaN(trade.closeTime.getTime()));
  };
