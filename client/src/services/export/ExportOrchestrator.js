import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { generateCSV } from './generators/csvGenerator';
import { generatePDF } from './generators/pdfGenerator';

export const exportTransactions = async (transactions, format, summary, options, currency) => {
  try {
    let fileUri = '';

    if (format === 'csv') {
      const csvString = generateCSV(transactions, options);
      // Clean filename
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Fynn_Transactions_${dateStr}.csv`;
      fileUri = FileSystem.cacheDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } else if (format === 'pdf') {
      fileUri = await generatePDF(transactions, summary, options, currency);
      // expo-print usually generates a UUID filename.
      // We could move it if we want a specific filename, but sharing handles the display name well on most platforms.
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: format === 'csv' ? 'text/csv' : 'application/pdf',
        dialogTitle: 'Export Fynn Transactions',
        UTI: format === 'csv' ? 'public.comma-separated-values-text' : 'com.adobe.pdf'
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }

    return { success: true };
  } catch (error) {
    console.error('Export Error:', error);
    return { success: false, error: error.message };
  }
};
