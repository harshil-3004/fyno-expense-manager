const Budget = require('../../models/Budget');
const Goal = require('../../models/Goal');
const smartInsightsService = require('../smartInsightsService');

// In-memory cache for user summaries
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Financial Context Builder
 * Gathers user financial details and formats them as a clean summary for prompt injection.
 * Implements in-memory caching to optimize performance.
 */
class FinancialContextBuilder {
  /**
   * Clears the summary cache for a specific user.
   * Useful when transactions are added, edited, or deleted.
   * @param {string} userId 
   */
  invalidateCache(userId) {
    cache.delete(userId.toString());
  }

  /**
   * Builds the context summary object for a user
   * @param {string} userId 
   * @returns {Promise<object>}
   */
  async buildContext(userId) {
    const cached = cache.get(userId.toString());
    const now = Date.now();

    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    const data = await this._gatherContext(userId);
    cache.set(userId.toString(), {
      data,
      timestamp: now
    });

    return data;
  }

  /**
   * Internal method to pull and aggregate MongoDB records
   */
  async _gatherContext(userId) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // 1. Fetch core monthly insights
    const monthlyIncome = await smartInsightsService.getMonthlyIncome(userId);
    const monthlyExpense = await smartInsightsService.getMonthlySpending(userId);
    const savings = monthlyIncome - monthlyExpense;

    // 2. Fetch top category spending
    const topCatAgg = await smartInsightsService.getTopCategory(userId);
    const topCategory = topCatAgg ? topCatAgg._id : 'None';
    const topCategoryAmount = topCatAgg ? topCatAgg.total : 0;

    // 3. Fetch tracking streaks
    const streakData = await smartInsightsService.getCurrentStreak(userId);
    const streak = streakData ? streakData.currentStreak : 0;

    // 4. Fetch daily reflection moods
    const reflectionSummary = await smartInsightsService.getReflectionSummary(userId);

    // 5. Fetch goals progress
    const goals = await Goal.find({ userId }).sort({ createdAt: -1 }).lean();
    const activeGoals = goals.map(g => {
      const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
      return {
        title: g.title,
        type: g.type,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        percentComplete: pct,
        targetDate: g.targetDate
      };
    });

    // 6. Fetch budgets and calculate limits
    const budgets = await Budget.find({ userId, month: currentMonth, year: currentYear }).lean();
    const categorySpending = await smartInsightsService.getCategorySpending(userId);
    
    // Map category totals for fast lookup
    const spentMap = {};
    categorySpending.forEach(item => {
      spentMap[item._id.toLowerCase()] = item.total;
    });

    const activeBudgets = [];
    const nearLimitBudgets = [];

    budgets.forEach(b => {
      const categoryLower = b.category.toLowerCase();
      const spent = spentMap[categoryLower] || 0;
      const remaining = b.monthlyLimit - spent;
      const percentUsed = b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0;
      
      const budgetInfo = {
        category: b.category,
        monthlyLimit: b.monthlyLimit,
        spent,
        remaining,
        percentUsed
      };

      activeBudgets.push(budgetInfo);

      // Trigger warning flag for budgets utilized >= 80%
      if (percentUsed >= 80) {
        nearLimitBudgets.push(budgetInfo);
      }
    });

    // 7. Get spending comparison to last month
    const comparison = await smartInsightsService.getMonthlyComparison(userId);

    return {
      monthlyIncome,
      monthlyExpense,
      savings,
      topCategory,
      topCategoryAmount,
      streak,
      activeGoals,
      activeBudgets,
      nearLimitBudgets,
      reflectionSummary: reflectionSummary?.moodCounts || { controlled: 0, average: 0, overspent: 0 },
      comparison: {
        lastTotal: comparison.lastTotal,
        percentChange: comparison.percentChange,
        direction: comparison.direction
      }
    };
  }
}

module.exports = new FinancialContextBuilder();
