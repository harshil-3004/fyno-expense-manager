const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const asyncHandler = require('../middleware/asyncHandler');
const { generateInsights } = require('../services/insights.service');
const mongoose = require('mongoose');

/**
 * @desc    Get monthly spending data (last 6 months)
 * @route   GET /api/analytics/monthly
 * @access  Private
 */
const getMonthlySpending = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const { timeframe } = req.query; // 'weekly', 'monthly', 'yearly'
  const now = new Date();

  // Define category colors/list to ensure we initialize all categories if needed, 
  // or just extract them dynamically.
  const categoriesList = ['food', 'travel', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];

  const initCategories = () => {
    const cats = {};
    categoriesList.forEach((c) => { cats[c] = 0; });
    return cats;
  };

  if (timeframe === 'weekly') {
    // Last 7 days
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const expenses = await Expense.find({
      userId,
      date: { $gte: sevenDaysAgo },
    });

    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d.getTime() + 24 * 60 * 60 * 1000);

      const dayExpenses = expenses.filter((e) => e.date >= d && e.date < nextD);
      const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

      const categories = initCategories();
      dayExpenses.forEach((e) => {
        const cat = e.category || 'other';
        categories[cat] = (categories[cat] || 0) + e.amount;
      });

      days.push({
        label: dayNames[d.getDay()],
        total,
        categories,
      });
    }

    return res.json(days);
  } else if (timeframe === 'yearly') {
    // Last 12 months
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const expenses = await Expense.find({
      userId,
      date: { $gte: twelveMonthsAgo },
    });

    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();

      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 1);

      const monthExpenses = expenses.filter((e) => e.date >= startOfMonth && e.date < endOfMonth);
      const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

      const categories = initCategories();
      monthExpenses.forEach((e) => {
        const cat = e.category || 'other';
        categories[cat] = (categories[cat] || 0) + e.amount;
      });

      months.push({
        label: monthNames[month],
        total,
        categories,
      });
    }

    return res.json(months);
  } else {
    // Monthly (default) - last 4 weeks (28 days)
    const twentyEightDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 27);
    twentyEightDaysAgo.setHours(0, 0, 0, 0);

    const expenses = await Expense.find({
      userId,
      date: { $gte: twentyEightDaysAgo },
    });

    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7 + 6));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const weekExpenses = expenses.filter((e) => e.date >= weekStart && e.date < weekEnd);
      const total = weekExpenses.reduce((sum, e) => sum + e.amount, 0);

      const categories = initCategories();
      weekExpenses.forEach((e) => {
        const cat = e.category || 'other';
        categories[cat] = (categories[cat] || 0) + e.amount;
      });

      weeks.push({
        label: `Wk ${4 - i}`,
        total,
        categories,
      });
    }

    return res.json(weeks);
  }
});

/**
 * @desc    Get expense breakdown by category
 * @route   GET /api/analytics/category
 * @access  Private
 */
const getCategoryBreakdown = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const { period } = req.query; // 'month' or 'all'

  const match = { userId };

  if (period === 'month') {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    match.date = { $gte: monthStart };
  }

  const data = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const grandTotal = data.reduce((sum, item) => sum + item.total, 0);

  const categoryColors = {
    food: '#FF9800',
    travel: '#2196F3',
    shopping: '#E91E63',
    bills: '#607D8B',
    entertainment: '#9C27B0',
    health: '#4CAF50',
    education: '#FF5722',
    other: '#795548',
  };

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

  const result = data.map((item) => ({
    category: item._id,
    label: categoryLabels[item._id] || item._id,
    total: item.total,
    count: item.count,
    percentage: grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0,
    color: categoryColors[item._id] || '#795548',
  }));

  res.json(result);
});

/**
 * @desc    Get income vs expense trend
 * @route   GET /api/analytics/income-expense
 * @access  Private
 */
const getIncomeExpenseTrend = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const expenseData = await Expense.aggregate([
    { $match: { userId, date: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const incomeData = await Income.aggregate([
    { $match: { userId, date: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trend = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    const expense = expenseData.find((e) => e._id.year === year && e._id.month === month);
    const income = incomeData.find((e) => e._id.year === year && e._id.month === month);

    trend.push({
      label: monthNames[month],
      year,
      month,
      income: income?.total || 0,
      expense: expense?.total || 0,
    });
  }

  res.json(trend);
});

/**
 * @desc    Get smart insights
 * @route   GET /api/analytics/insights
 * @access  Private
 */
const getInsights = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const insights = await generateInsights(userId);
  res.json(insights);
});

/**
 * @desc    Get planning analytics overview (Budgets and Goals)
 * @route   GET /api/analytics/planning
 * @access  Private
 */
const getPlanningOverview = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 1);

  // 1. Fetch budgets & current month expenses
  const budgets = await Budget.find({ userId, month, year }).lean();
  const expensesAgg = await Expense.aggregate([
    {
      $match: {
        userId,
        date: { $gte: startOfMonth, $lt: endOfMonth },
      },
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$amount' },
      },
    },
  ]);

  const spentMap = {};
  expensesAgg.forEach((item) => {
    spentMap[item._id] = item.totalSpent;
  });

  let totalBudgetLimit = 0;
  let totalBudgetSpent = 0;
  let exceededCount = 0;
  let warningCount = 0;
  let safeCount = 0;

  const budgetItems = budgets.map((b) => {
    const spent = spentMap[b.category] || 0;
    const remaining = b.monthlyLimit - spent;
    const usagePercentage = b.monthlyLimit > 0 ? parseFloat(((spent / b.monthlyLimit) * 100).toFixed(1)) : 0;
    
    let status = 'Safe';
    if (usagePercentage >= 100) {
      status = 'Exceeded';
      exceededCount++;
    } else if (usagePercentage >= 75) {
      status = 'Warning';
      warningCount++;
    } else {
      safeCount++;
    }

    totalBudgetLimit += b.monthlyLimit;
    totalBudgetSpent += spent;

    return {
      ...b,
      spent,
      remaining,
      usagePercentage,
      status,
    };
  });

  // 2. Fetch Goals
  const goals = await Goal.find({ userId }).sort({ createdAt: -1 }).lean();
  let totalTargetAmount = 0;
  let totalCurrentSaved = 0;
  let completedCount = 0;

  const goalItems = goals.map((g) => {
    totalTargetAmount += g.targetAmount;
    totalCurrentSaved += g.currentAmount;
    const progressPercentage = g.targetAmount > 0 ? parseFloat(((g.currentAmount / g.targetAmount) * 100).toFixed(1)) : 0;
    
    if (g.currentAmount >= g.targetAmount) {
      completedCount++;
    }

    return {
      ...g,
      progressPercentage,
      remaining: g.targetAmount - g.currentAmount,
    };
  });

  // 3. Fetch actual income vs actual expenses for the month
  const [totalIncomeAgg] = await Income.aggregate([
    {
      $match: {
        userId,
        date: { $gte: startOfMonth, $lt: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  const [totalExpenseAgg] = await Expense.aggregate([
    {
      $match: {
        userId,
        date: { $gte: startOfMonth, $lt: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  const actualIncome = totalIncomeAgg?.total || 0;
  const actualExpenses = totalExpenseAgg?.total || 0;

  res.json({
    budgetUsage: {
      totalBudgetLimit,
      totalBudgetSpent,
      budgetsCount: budgets.length,
      exceededCount,
      warningCount,
      safeCount,
      items: budgetItems,
    },
    goalProgress: {
      totalTargetAmount,
      totalCurrentSaved,
      goalsCount: goals.length,
      completedCount,
      items: goalItems,
    },
    monthlyPlanning: {
      income: actualIncome,
      actualExpenses,
      budgetLimit: totalBudgetLimit,
      budgetSpent: totalBudgetSpent,
      savedInGoals: totalCurrentSaved,
      month,
      year,
    },
  });
});

module.exports = {
  getMonthlySpending,
  getCategoryBreakdown,
  getIncomeExpenseTrend,
  getInsights,
  getPlanningOverview,
};
