export const CATEGORIES = [
  { id: 'food', label: 'Food', emoji: '🍔', color: '#FF9800' },
  { id: 'travel', label: 'Travel', emoji: '🚗', color: '#2196F3' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#E91E63' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎮', color: '#9C27B0' },
  { id: 'health', label: 'Health', emoji: '💊', color: '#4CAF50' },
  { id: 'education', label: 'Education', emoji: '📚', color: '#FF5722' },
  { id: 'bills', label: 'Bills', emoji: '📄', color: '#607D8B' },
  { id: 'other', label: 'Other', emoji: '✨', color: '#795548' },
];

export const getCategoryById = (id) => {
  return CATEGORIES.find((cat) => cat.id === id) || CATEGORIES[CATEGORIES.length - 1];
};

export default CATEGORIES;
