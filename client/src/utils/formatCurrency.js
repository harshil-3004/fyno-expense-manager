import { getCurrencySymbol } from '../constants/emptyStates';

/**
 * Format a number as currency string.
 * @param {number} amount
 * @param {string} currencyCode - e.g. 'INR', 'USD'
 * @returns {string} formatted string e.g. "₹12,450"
 */
export const formatCurrency = (amount, currencyCode = 'INR') => {
  const symbol = getCurrencySymbol(currencyCode);
  const num = Number(amount) || 0;

  // Use locale-based formatting
  const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';

  const formatted = Math.abs(num).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const sign = num < 0 ? '-' : '';

  return `${sign}${symbol}${formatted}`;
};

/**
 * Format amount with + or - prefix and color-appropriate sign.
 */
export const formatSignedAmount = (amount, type, currencyCode = 'INR') => {
  const prefix = type === 'income' ? '+' : '-';
  return `${prefix}${formatCurrency(Math.abs(amount), currencyCode)}`;
};
