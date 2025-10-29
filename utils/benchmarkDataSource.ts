import { BenchmarkDataPoint } from '../types';

// Parses a CSV from a Google Sheet published to the web.
// Expected format: Date (YYYY-MM-DD), Open, Close
export const fetchBenchmarkData = async (url: string): Promise<BenchmarkDataPoint[]> => {
    const response = await fetch(url, { cache: 'reload' });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim() !== '');

    if (lines.length < 2) {
        throw new Error("Benchmark CSV must have a header and at least one data row.");
    }

    const dataPoints: BenchmarkDataPoint[] = [];
    // Skip header line (lines[0])
    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',');
        if (columns.length < 3) continue;

        const dateStr = columns[0].trim();
        const closeStr = columns[2].trim();
        
        // Date format is YYYY-MM-DD
        const dateParts = dateStr.split('-');
        if (dateParts.length !== 3) continue; // Malformed date
        
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);

        const date = new Date(Date.UTC(year, month, day));
        const close = parseFloat(closeStr);

        if (!isNaN(date.getTime()) && !isNaN(close)) {
            dataPoints.push({ date, close });
        }
    }
    
    if (dataPoints.length === 0) {
        throw new Error("No valid data points could be parsed from the benchmark CSV.");
    }

    // Sort by date ascending
    return dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
};
