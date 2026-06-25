const Expense = require('../models/Expense');
const Income = require('../models/Income');
const DailyReflection = require('../models/DailyReflection');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const asyncHandler = require('../middleware/asyncHandler');
const { getStreak, updateStreak } = require('../services/streak.service');
const mongoose = require('mongoose');

/**
 * @desc    Get dashboard summary
 * @route   GET /api/dashboard/summary
 * @access  Private
 */
const getSummary = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Total income & expenses (all time)
  const [totalExpenseAgg] = await Expense.aggregate([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const [totalIncomeAgg] = await Income.aggregate([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const totalExpenses = totalExpenseAgg?.total || 0;
  const totalIncome = totalIncomeAgg?.total || 0;
  const balance = totalIncome - totalExpenses;

  // Monthly snapshot
  const [monthlyExpenseAgg] = await Expense.aggregate([
    { $match: { userId, date: { $gte: currentMonthStart } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const [monthlyIncomeAgg] = await Income.aggregate([
    { $match: { userId, date: { $gte: currentMonthStart } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const monthlyExpenses = monthlyExpenseAgg?.total || 0;
  const monthlyIncome = monthlyIncomeAgg?.total || 0;
  const monthlySavings = monthlyIncome - monthlyExpenses;

  // Recent 5 transactions (expenses + income merged and sorted)
  const recentExpenses = await Expense.find({ userId })
    .sort({ date: -1 })
    .limit(5)
    .lean();

  const recentIncomes = await Income.find({ userId })
    .sort({ date: -1 })
    .limit(5)
    .lean();

  const recentTransactions = [
    ...recentExpenses.map((e) => ({ ...e, type: 'expense' })),
    ...recentIncomes.map((i) => ({ ...i, type: 'income', title: i.sourceName })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  // Tracking streak
  const streak = await getStreak(req.user._id);

  // Today's reflection
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayReflection = await DailyReflection.findOne({
    userId: req.user._id,
    date: { $gte: today, $lt: tomorrow },
  });

  // Active goals: count of goals where currentAmount < targetAmount
  const activeGoalsCount = await Goal.countDocuments({
    userId: req.user._id,
    $expr: { $lt: ['$currentAmount', '$targetAmount'] },
  });

  // Near limit budgets: count of current month's budgets where utilization is >= 75%
  const budgets = await Budget.find({
    userId: req.user._id,
    month: currentMonthStart.getMonth() + 1,
    year: currentMonthStart.getFullYear(),
  });

  const monthExpensesAgg = await Expense.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(req.user._id),
        date: { $gte: currentMonthStart },
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
  monthExpensesAgg.forEach((item) => {
    spentMap[item._id] = item.totalSpent;
  });

  let nearLimitBudgets = 0;
  budgets.forEach((budget) => {
    const spent = spentMap[budget.category] || 0;
    const usagePercent = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
    if (usagePercent >= 75) {
      nearLimitBudgets++;
    }
  });

  res.json({
    balance,
    totalIncome,
    totalExpenses,
    savings: balance,
    monthly: {
      income: monthlyIncome,
      expenses: monthlyExpenses,
      savings: monthlySavings,
    },
    recentTransactions,
    streak,
    todayReflection: todayReflection || null,
    planningSummary: {
      activeGoals: activeGoalsCount,
      nearLimitBudgets,
    },
  });
});

/**
 * @desc    Submit daily reflection
 * @route   POST /api/dashboard/reflection
 * @access  Private
 */
const submitReflection = asyncHandler(async (req, res) => {
  const { mood, note } = req.body;

  if (!mood || !['controlled', 'average', 'overspent'].includes(mood)) {
    return res.status(400).json({ message: 'Valid mood is required (controlled, average, overspent)' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upsert: create or update today's reflection
  const reflection = await DailyReflection.findOneAndUpdate(
    {
      userId: req.user._id,
      date: today,
    },
    {
      userId: req.user._id,
      mood,
      note: note || '',
      date: today,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  // Update tracking streak (reflection counts as activity)
  await updateStreak(req.user._id);

  res.json(reflection);
});

/**
 * @desc    Get today's reflection
 * @route   GET /api/dashboard/reflection
 * @access  Private
 */
const getReflection = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const reflection = await DailyReflection.findOne({
    userId: req.user._id,
    date: { $gte: today, $lt: tomorrow },
  });

  res.json(reflection || { mood: null, note: null });
});

module.exports = { getSummary, submitReflection, getReflection };
