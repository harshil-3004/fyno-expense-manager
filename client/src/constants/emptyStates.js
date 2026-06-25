export const EMPTY_STATES = {
  expenses: {
    emoji: '📝',
    title: 'Your financial story starts here',
    subtitle: 'Add your first expense and let Fyno remember it for you.',
    actionLabel: 'Add Expense',
  },
  income: {
    emoji: '💰',
    title: 'Let\'s track your earnings',
    subtitle: 'Add your first income source and start tracking your progress.',
    actionLabel: 'Add Income',
  },
  history: {
    emoji: '📖',
    title: 'Nothing recorded yet',
    subtitle: 'Your transaction history will appear here once you start tracking.',
    actionLabel: 'Add Transaction',
  },
  insights: {
    emoji: '💡',
    title: 'Insights are brewing',
    subtitle: 'Keep using Fyno for a few days. We\'ll start finding patterns in your spending.',
    actionLabel: null,
  },
  search: {
    emoji: '🔍',
    title: 'No matches found',
    subtitle: 'Try a different search term or adjust your filters.',
    actionLabel: null,
  },
  pulse: {
    emoji: '👋',
    title: 'Welcome to Fyno',
    subtitle: 'Start by adding your income and expenses. Fyno will do the rest.',
    actionLabel: 'Get Started',
  },
};

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

export const getCurrencySymbol = (code) => {
  const currency = CURRENCIES.find((c) => c.code === code);
  return currency ? currency.symbol : '₹';
};

export const MOODS = [
  { id: 'controlled', emoji: '😊', label: 'Controlled' },
  { id: 'average', emoji: '😐', label: 'Average' },
  { id: 'overspent', emoji: '😅', label: 'Overspent' },
];
