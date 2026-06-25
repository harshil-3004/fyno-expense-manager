/**
 * Lightweight Intent Detection Engine for Fynn Companion (Phase 2)
 * Normalized token matching mapping questions to precise analytics hooks.
 */
const detectIntent = (message) => {
  if (!message) return 'unknown';

  // Normalize message (lowercase, strip punctuation)
  const normalized = message
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');

  const tokens = normalized.split(/\s+/);

  const matches = (keywords) => {
    return keywords.some(keyword => normalized.includes(keyword));
  };

  // 1. Food Category Specific Spending
  if (matches(['food', 'eat', 'restaurant', 'groceries', 'lunch', 'dinner', 'breakfast', 'starbucks', 'cafe'])) {
    return 'food_spending';
  }

  // 2. Travel Category Specific Spending
  if (matches(['travel', 'transport', 'cab', 'uber', 'taxi', 'flight', 'bus', 'train', 'metro', 'commute'])) {
    return 'travel_spending';
  }

  // 3. Shopping Category Specific Spending
  if (matches(['shopping', 'clothes', 'bought', 'amazon', 'mall', 'purchase', 'buy'])) {
    // Check if user is asking for their largest purchase specifically
    if (matches(['largest', 'biggest', 'max', 'highest'])) {
      return 'largest_expense';
    }
    return 'shopping_spending';
  }

  // 4. Largest Expense
  if (matches(['largest', 'biggest', 'max', 'highest', 'most expensive', 'peak spending'])) {
    return 'largest_expense';
  }

  // 5. Recent Expenses
  if (matches(['recent', 'latest', 'transactions', 'history', 'last expense', 'last transaction', 'show log'])) {
    return 'recent_expenses';
  }

  // 5a. Budget Limit Checking (closest to limit)
  if (matches(['closest', 'near limit', 'limit']) && matches(['budget', 'budgets'])) {
    return 'budget_closest_limit';
  }

  // 5b. Budget Remaining
  if (matches(['budget', 'budgets'])) {
    return 'budget_remaining';
  }

  // 5c. Overspending checks
  if (matches(['overspending', 'overspent', 'am i overspending', 'spending too much', 'exceed'])) {
    return 'overspending_status';
  }

  // 6. Goal Progress & Savings Goals
  if (matches(['goal', 'goals', 'how much have i saved', 'how much did i save', 'saved so far', 'total saved', 'saved for'])) {
    return 'goal_progress';
  }

  // 6b. Savings Summary (Fallback for general savings queries)
  if (matches(['save', 'saved', 'savings'])) {
    return 'savings_summary';
  }

  // 7. Income Summary
  if (matches(['income', 'earn', 'earning', 'earned', 'salary', 'paycheck', 'revenue'])) {
    return 'income_summary';
  }

  // 8. Streak Info
  if (matches(['streak', 'streaks', 'consecutive', 'days tracking'])) {
    return 'streak_info';
  }

  // 9. Reflection Summary
  if (matches(['reflection', 'reflections', 'mood', 'moods', 'feelings', 'feeling', 'emotional spending'])) {
    return 'reflection_summary';
  }

  // 10. Monthly Comparison
  if (matches(['compare', 'comparison', 'vs last', 'compared to last', 'different from last'])) {
    return 'monthly_comparison';
  }

  // 11. Category Spending Breakdown
  if (matches(['category', 'categories', 'breakdown', 'distribution', 'by area', 'by segment'])) {
    return 'category_spending';
  }

  // 12. Weekly Spending
  if (matches(['week', 'weekly', 'this week', 'past 7 days'])) {
    return 'weekly_spending';
  }

  // 13. Monthly Spending (broad fallback for spending questions)
  if (matches(['spend', 'spending', 'spent', 'expense', 'expenses', 'outflow', 'cost', 'costs', 'summary', 'summery', 'monthly summary', 'monthly summery'])) {
    return 'monthly_spending';
  }

  // 14. Help
  if (matches(['help', 'guide', 'features', 'what can you do', 'options', 'how to use', 'commands'])) {
    return 'help';
  }

  return 'unknown';
};

module.exports = { detectIntent };
