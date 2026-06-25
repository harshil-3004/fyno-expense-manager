const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const DailyReflection = require('../models/DailyReflection');
const { getStreak } = require('./streak.service');

/**
 * Smart Insights Service (Phase 2)
 * High-performance aggregation pipeline functions to query MongoDB user data.
 */

// Helper to get time boundary dates
const getTimeBoundaries = () => {
  const now = new Date();
  
  // Current month boundaries
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  // Last month boundaries
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  
  // Current week boundaries (starting Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return { now, startOfMonth, endOfMonth, startOfLastMonth, endOfLastMonth, startOfWeek };
};

const getMonthlySpending = async (userId) => {
  const { startOfMonth, now } = getTimeBoundaries();
  const result = await Expense.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startOfMonth, $lte: now },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total || 0;
};

const getWeeklySpending = async (userId) => {
  const { startOfWeek, now } = getTimeBoundaries();
  const result = await Expense.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startOfWeek, $lte: now },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total || 0;
};

const getCategorySpending = async (userId, category = null) => {
  const { startOfMonth, now } = getTimeBoundaries();
  
  if (category) {
    const result = await Expense.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          category: category.toLowerCase(),
          date: { $gte: startOfMonth, $lte: now },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total || 0;
  } else {
    const result = await Expense.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startOfMonth, $lte: now },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);
    return result; // Array of { _id: categoryName, total: Number }
  }
};

const getLargestExpense = async (userId) => {
  const { startOfMonth, now } = getTimeBoundaries();
  const expense = await Expense.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: startOfMonth, $lte: now },
  })
    .sort({ amount: -1 })
    .limit(1);
  return expense;
};

const getRecentExpenses = async (userId, limit = 5) => {
  const expenses = await Expense.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ date: -1 })
    .limit(limit);
  return expenses;
};

const getMonthlyIncome = async (userId) => {
  const { startOfMonth, now } = getTimeBoundaries();
  const result = await Income.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startOfMonth, $lte: now },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total || 0;
};

const getSavings = async (userId) => {
  const income = await getMonthlyIncome(userId);
  const expenses = await getMonthlySpending(userId);
  return income - expenses;
};

const getTopCategory = async (userId) => {
  const categories = await getCategorySpending(userId);
  return categories[0] || null; // Returns { _id: categoryName, total: Number }
};

const getMonthlyComparison = async (userId) => {
  const { startOfLastMonth, endOfLastMonth } = getTimeBoundaries();
  const currentTotal = await getMonthlySpending(userId);
  
  const resultLastMonth = await Expense.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const lastTotal = resultLastMonth[0]?.total || 0;
  
  let percentChange = 0;
  let direction = 'same';
  if (lastTotal > 0) {
    percentChange = Math.round(((currentTotal - lastTotal) / lastTotal) * 100);
    if (percentChange > 0) direction = 'higher';
    else if (percentChange < 0) direction = 'lower';
  }
  
  return {
    currentTotal,
    lastTotal,
    percentChange: Math.abs(percentChange),
    direction,
  };
};

const getCurrentStreak = async (userId) => {
  return await getStreak(userId);
};

const getReflectionSummary = async (userId) => {
  const { startOfMonth, now } = getTimeBoundaries();
  const reflections = await DailyReflection.find({
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: startOfMonth, $lte: now },
  });

  const moodCounts = { controlled: 0, average: 0, overspent: 0 };
  reflections.forEach((ref) => {
    if (moodCounts[ref.mood] !== undefined) {
      moodCounts[ref.mood]++;
    }
  });

  return {
    total: reflections.length,
    moodCounts,
  };
};

const generateDynamicInsights = async (userId) => {
  const insights = [];
  
  // MoM spending comparison
  const comparison = await getMonthlyComparison(userId);
  if (comparison.lastTotal > 0 && comparison.percentChange > 0) {
    if (comparison.direction === 'lower') {
      insights.push({
        text: `You spent ${comparison.percentChange}% less this month 🎉`,
        emoji: '🎉',
        type: 'positive',
      });
    } else {
      insights.push({
        text: `Your spending is up ${comparison.percentChange}% compared to last month 📊`,
        emoji: '📊',
        type: 'neutral',
      });
    }
  }

  // Top spending category
  const topCat = await getTopCategory(userId);
  if (topCat) {
    const formatName = topCat._id.charAt(0).toUpperCase() + topCat._id.slice(1);
    insights.push({
      text: `${formatName} remains your highest spending category.`,
      emoji: '🍟',
      type: 'info',
    });
  }

  // Streak info
  const streak = await getCurrentStreak(userId);
  if (streak.currentStreak > 0) {
    insights.push({
      text: `You've maintained a ${streak.currentStreak}-day streak 🔥`,
      emoji: '🔥',
      type: 'positive',
    });
  } else {
    insights.push({
      text: 'Log your mood or expenses daily to start a streak! 🚀',
      emoji: '🚀',
      type: 'neutral',
    });
  }

  // Fallback if we have fewer insights
  if (insights.length < 2) {
    insights.push({
      text: 'Track your income and expenses to unlock deeper financial insights. 💰',
      emoji: '💰',
      type: 'info',
    });
  }

  // Limit to maximum of 3 insights
  return insights.slice(0, 3);
};

module.exports = {
  getMonthlySpending,
  getWeeklySpending,
  getCategorySpending,
  getLargestExpense,
  getRecentExpenses,
  getMonthlyIncome,
  getSavings,
  getTopCategory,
  getMonthlyComparison,
  getCurrentStreak,
  getReflectionSummary,
  generateDynamicInsights,
};
