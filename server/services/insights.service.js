const Expense = require('../models/Expense');
const Income = require('../models/Income');

/**
 * Generate human-readable smart insights from user's financial data.
 * Returns an array of insight objects: { text, emoji, type }
 */
const generateInsights = async (userId) => {
  const insights = [];
  const now = new Date();

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // --- 1. Month-over-month spending comparison ---
  const [currentMonthSpending] = await Expense.aggregate([
    {
      $match: {
        userId,
        date: { $gte: currentMonthStart, $lte: now },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const [lastMonthSpending] = await Expense.aggregate([
    {
      $match: {
        userId,
        date: { $gte: lastMonthStart, $lte: lastMonthEnd },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const currentTotal = currentMonthSpending?.total || 0;
  const lastTotal = lastMonthSpending?.total || 0;

  if (lastTotal > 0 && currentTotal > 0) {
    const percentChange = Math.round(
      ((currentTotal - lastTotal) / lastTotal) * 100
    );
    if (percentChange < 0) {
      insights.push({
        text: `You spent ${Math.abs(percentChange)}% less than last month`,
        emoji: '🎉',
        type: 'positive',
      });
    } else if (percentChange > 0) {
      insights.push({
        text: `Your spending is up ${percentChange}% compared to last month`,
        emoji: '📊',
        type: 'neutral',
      });
    } else {
      insights.push({
        text: `Your spending is about the same as last month`,
        emoji: '📊',
        type: 'neutral',
      });
    }
  }

  // --- 2. Top spending category this month ---
  const topCategory = await Expense.aggregate([
    {
      $match: {
        userId,
        date: { $gte: currentMonthStart, $lte: now },
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
    { $limit: 1 },
  ]);

  if (topCategory.length > 0) {
    const categoryLabels = {
      food: 'Food',
      travel: 'Travel',
      shopping: 'Shopping',
      bills: 'Bills',
      entertainment: 'Entertainment',
      health: 'Health',
      education: 'Education',
      other: 'Other',
    };
    const label = categoryLabels[topCategory[0]._id] || topCategory[0]._id;
    insights.push({
      text: `${label} was your biggest spending category this month`,
      emoji: '💡',
      type: 'info',
    });
  }

  // --- 3. Day-of-week spending pattern ---
  const dayOfWeekSpending = await Expense.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: { $dayOfWeek: '$date' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 1 },
  ]);

  if (dayOfWeekSpending.length > 0) {
    const dayNames = [
      '',
      'Sundays',
      'Mondays',
      'Tuesdays',
      'Wednesdays',
      'Thursdays',
      'Fridays',
      'Saturdays',
    ];
    const topDay = dayNames[dayOfWeekSpending[0]._id];
    if (topDay) {
      insights.push({
        text: `You usually spend the most on ${topDay}`,
        emoji: '📅',
        type: 'info',
      });
    }
  }

  // --- 4. This week spending consistency ---
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekExpenses = await Expense.aggregate([
    {
      $match: {
        userId,
        date: { $gte: weekStart, $lte: now },
      },
    },
    { $group: { _id: { $dayOfWeek: '$date' }, total: { $sum: '$amount' } } },
  ]);

  if (thisWeekExpenses.length >= 3) {
    const amounts = thisWeekExpenses.map((d) => d.total);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxDeviation = Math.max(...amounts.map((a) => Math.abs(a - avg)));
    const isConsistent = maxDeviation < avg * 0.5;

    if (isConsistent) {
      insights.push({
        text: 'Your spending has been consistent this week',
        emoji: '✨',
        type: 'positive',
      });
    }
  }

  // --- 5. Income vs Expense ratio ---
  const [currentMonthIncome] = await Income.aggregate([
    {
      $match: {
        userId,
        date: { $gte: currentMonthStart, $lte: now },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const incomeTotal = currentMonthIncome?.total || 0;

  if (incomeTotal > 0 && currentTotal > 0) {
    const savingsRate = Math.round(
      ((incomeTotal - currentTotal) / incomeTotal) * 100
    );
    if (savingsRate > 30) {
      insights.push({
        text: `You're saving ${savingsRate}% of your income this month — great job!`,
        emoji: '🏆',
        type: 'positive',
      });
    } else if (savingsRate > 0) {
      insights.push({
        text: `You're saving ${savingsRate}% of your income this month`,
        emoji: '💰',
        type: 'neutral',
      });
    } else {
      insights.push({
        text: `Your expenses exceed your income this month`,
        emoji: '⚠️',
        type: 'warning',
      });
    }
  }

  return insights;
};

module.exports = { generateInsights };
