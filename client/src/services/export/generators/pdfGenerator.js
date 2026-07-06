import * as Print from 'expo-print';
import { CATEGORIES } from '../../../constants/categories';
import { formatDate, formatTime, formatProperDate } from '../../../utils/formatDate';
import { formatCurrency } from '../../../utils/formatCurrency';

export const generatePDF = async (transactions, summary, options, currency = 'INR') => {
  // Aggregate category summary
  const categoryTotals = {};
  transactions.forEach((tx) => {
    if (tx.type === 'expense') {
      const amount = tx.amount || 0;
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amount;
    }
  });

  const categoryRows = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]).map(catId => {
    const cat = CATEGORIES.find(c => c.id === catId);
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <span style="font-size: 18px; margin-right: 8px;">${cat ? cat.emoji : '✨'}</span>
          ${cat ? cat.label : 'Other'}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #E53935;">
          ${formatCurrency(categoryTotals[catId], currency)}
        </td>
      </tr>
    `;
  }).join('');

  const transactionRows = transactions.map((tx) => {
    const isExpense = tx.type === 'expense';
    const amountStr = isExpense ? `- ${formatCurrency(tx.amount || 0, currency)}` : `+ ${formatCurrency(tx.amount || 0, currency)}`;
    const amountColor = isExpense ? '#E53935' : '#4CAF50';
    
    let catLabel = 'Income';
    if (isExpense) {
      const cat = CATEGORIES.find(c => c.id === tx.category);
      catLabel = cat ? cat.label : 'Other';
    }

    const dateStr = options.dateAndTime !== false ? `
      <div style="font-size: 12px; color: #666; margin-top: 4px;">
        ${formatDate(tx.date)} ${formatTime(tx.date)}
      </div>
    ` : '';

    const descStr = options.notes !== false && tx.description ? `
      <div style="font-size: 12px; color: #888; margin-top: 4px;">${tx.description}</div>
    ` : '';

    return `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #eee; vertical-align: top;">
          <div style="font-weight: bold; font-size: 14px; color: #333;">${tx.title || tx.sourceName || catLabel}</div>
          <div style="font-size: 12px; color: #999;">${catLabel}</div>
          ${descStr}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top;">
          <div style="font-weight: bold; font-size: 14px; color: ${amountColor};">${amountStr}</div>
          ${dateStr}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fynn Transaction Report</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #FFB84C; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: 800; letter-spacing: -1px; color: #2D2A32; }
        .logo span { color: #FFB84C; }
        .report-title { font-size: 24px; font-weight: bold; text-align: right; margin-bottom: 8px;}
        .report-date { font-size: 14px; color: #666; text-align: right;}
        
        .summary-cards { display: flex; gap: 20px; margin-bottom: 40px; }
        .card { flex: 1; padding: 20px; background: #f9f9f9; border-radius: 12px; border: 1px solid #eee; }
        .card-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; }
        .card-value { font-size: 24px; font-weight: bold; }
        .value-green { color: #4CAF50; }
        .value-red { color: #E53935; }
        .value-dark { color: #333; }
        
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 16px; margin-top: 30px; color: #2D2A32; border-bottom: 1px solid #ddd; padding-bottom: 8px;}
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;}
        th { text-align: left; padding: 12px 16px; background-color: #f5f5f5; color: #666; font-size: 12px; text-transform: uppercase;}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">fyno<span>.</span></div>
        <div>
          <div class="report-title">Transaction Report</div>
          <div class="report-date">Generated: ${formatProperDate(new Date())}</div>
          <div class="report-date" style="margin-top: 4px;">Period: ${summary.dateRangeString}</div>
        </div>
      </div>
      
      <div class="summary-cards">
        <div class="card">
          <div class="card-title">Total Income</div>
          <div class="card-value value-green">${formatCurrency(summary.totalIncome, currency)}</div>
        </div>
        <div class="card">
          <div class="card-title">Total Expenses</div>
          <div class="card-value value-red">${formatCurrency(summary.totalExpense, currency)}</div>
        </div>
        <div class="card">
          <div class="card-title">Net Savings</div>
          <div class="card-value value-dark">${formatCurrency(summary.totalIncome - summary.totalExpense, currency)}</div>
        </div>
      </div>
      
      <div class="section-title">Category Breakdown (Expenses)</div>
      <table style="width: 50%;">
        <tbody>
          ${categoryRows || '<tr><td style="padding: 12px;">No expenses for this period.</td></tr>'}
        </tbody>
      </table>

      <div class="section-title" style="page-break-before: auto;">Transactions (${summary.count})</div>
      <table>
        <thead>
          <tr>
            <th>Details</th>
            <th style="text-align: right;">Amount & Date</th>
          </tr>
        </thead>
        <tbody>
          ${transactionRows || '<tr><td colspan="2" style="padding: 16px; text-align: center;">No transactions found.</td></tr>'}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
};
