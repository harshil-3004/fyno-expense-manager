import { CATEGORIES } from '../../../constants/categories';
import { formatDate, formatTime } from '../../../utils/formatDate';
import { getSourceById } from '../../../constants/sources';

export const generateCSV = (transactions, options) => {
  const headers = [];
  
  if (options.dateAndTime !== false) {
    headers.push('Date', 'Time');
  }
  
  headers.push('Type');
  
  if (options.category !== false) headers.push('Category');
  
  headers.push('Title');
  
  if (options.notes !== false) headers.push('Description');
  
  headers.push('Amount');
  
  if (options.paymentMethod !== false) headers.push('Payment Method');
  if (options.source !== false) headers.push('Source');
  
  const escapeCSV = (str) => {
    if (!str && str !== 0) return '';
    const safeStr = str.toString().replace(/"/g, '""');
    return `"${safeStr}"`;
  };

  const rows = transactions.map((tx) => {
    const row = [];
    const isExpense = tx.type === 'expense';
    
    if (options.dateAndTime !== false) {
      row.push(escapeCSV(formatDate(tx.date)));
      row.push(escapeCSV(formatTime(tx.date)));
    }
    
    row.push(escapeCSV(isExpense ? 'Expense' : 'Income'));
    
    if (options.category !== false) {
      if (isExpense) {
        const cat = CATEGORIES.find(c => c.id === tx.category);
        row.push(escapeCSV(cat ? cat.label : 'Other'));
      } else {
        row.push(escapeCSV('Income'));
      }
    }
    
    row.push(escapeCSV(tx.title || tx.sourceName || (isExpense ? 'Expense' : 'Income')));
    
    if (options.notes !== false) {
      row.push(escapeCSV(tx.description || ''));
    }
    
    row.push(escapeCSV(tx.amount || 0));
    
    if (options.paymentMethod !== false) {
      row.push(escapeCSV(tx.paymentMethod || ''));
    }
    
    if (options.source !== false) {
      const source = tx.source ? getSourceById(tx.source) : null;
      row.push(escapeCSV(source ? source.label : ''));
    }
    
    return row.join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
};
