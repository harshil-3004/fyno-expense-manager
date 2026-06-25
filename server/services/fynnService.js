const User = require('../models/User');
const FynnConversation = require('../models/FynnConversation');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const intentDetectionService = require('./intentDetectionService');
const smartInsightsService = require('./smartInsightsService');
const mongoose = require('mongoose');

/**
 * Fynn Companion Core Service (Phase 2)
 * Core abstraction layer mapping detected intents to MongoDB data queries and formatting replies.
 */

// Helper to get currency symbol
const getCurrencySymbol = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return '₹';
  return user.currency === 'USD' ? '$' : '₹';
};

// Format dates nicely
const formatDate = (dateString) => {
  const d = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

const generateFynnResponse = async (userId, message) => {
  const intent = intentDetectionService.detectIntent(message);
  const symbol = await getCurrencySymbol(userId);
  
  let responseText = '';

  switch (intent) {
    case 'goal_progress': {
      const goals = await Goal.find({ userId }).sort({ createdAt: -1 });
      if (goals.length === 0) {
        responseText = `You don't have any savings goals set up yet. 🎯\n\nStart saving by setting up a goal in the Plan tab!`;
      } else {
        // Check if message mentions a specific goal title
        let matchedGoal = null;
        for (const goal of goals) {
          const titleLower = goal.title.toLowerCase();
          if (message.toLowerCase().includes(titleLower)) {
            matchedGoal = goal;
            break;
          }
        }

        if (matchedGoal) {
          const pct = matchedGoal.targetAmount > 0 ? Math.round((matchedGoal.currentAmount / matchedGoal.targetAmount) * 100) : 0;
          responseText = `You have saved ${symbol}${matchedGoal.currentAmount.toLocaleString()} of ${symbol}${matchedGoal.targetAmount.toLocaleString()} for your ${matchedGoal.title} Goal.\n\nYou are ${pct}% complete.`;
        } else {
          // General goals summary
          responseText = `Here is your goal progress summary:\n\n` +
            goals.map(g => {
              const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
              return `🎯 ${g.title}: ${symbol}${g.currentAmount.toLocaleString()} / ${symbol}${g.targetAmount.toLocaleString()} (${pct}% complete)`;
            }).join('\n');
        }
      }
      break;
    }

    case 'budget_remaining': {
      const categories = ['food', 'travel', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
      let matchedCategory = null;
      for (const cat of categories) {
        if (message.toLowerCase().includes(cat)) {
          matchedCategory = cat;
          break;
        }
      }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      if (matchedCategory) {
        const budget = await Budget.findOne({ userId, category: matchedCategory, month, year });
        if (!budget) {
          const catName = matchedCategory.charAt(0).toUpperCase() + matchedCategory.slice(1);
          responseText = `You don't have a ${catName} budget set for this month. 📊\n\nYou can set one up on the Plan tab!`;
        } else {
          // Calculate spending dynamically
          const startOfMonth = new Date(year, month - 1, 1);
          const endOfMonth = new Date(year, month, 1);
          const [spentAgg] = await Expense.aggregate([
            {
              $match: {
                userId: new mongoose.Types.ObjectId(userId),
                category: matchedCategory,
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

          const spent = spentAgg?.totalSpent || 0;
          const remaining = budget.monthlyLimit - spent;
          const pct = budget.monthlyLimit > 0 ? Math.round((spent / budget.monthlyLimit) * 100) : 0;
          const catName = matchedCategory.charAt(0).toUpperCase() + matchedCategory.slice(1);

          responseText = `Your ${catName} Budget is ${pct}% utilized.\n\n${symbol}${remaining.toLocaleString()} remains for this month.`;
        }
      } else {
        // Show remaining budget for all categories
        const budgets = await Budget.find({ userId, month, year }).lean();
        if (budgets.length === 0) {
          responseText = `You have no budgets set for this month. 📊\n\nSet up monthly limits on the Plan tab to track category spending.`;
        } else {
          const startOfMonth = new Date(year, month - 1, 1);
          const endOfMonth = new Date(year, month, 1);
          const expensesAgg = await Expense.aggregate([
            {
              $match: {
                userId: new mongoose.Types.ObjectId(userId),
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

          responseText = `Here is your remaining budget for this month:\n\n` +
            budgets.map(b => {
              const spent = spentMap[b.category] || 0;
              const remaining = b.monthlyLimit - spent;
              const pct = b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0;
              const catName = b.category.charAt(0).toUpperCase() + b.category.slice(1);
              return `• ${catName}: ${symbol}${remaining.toLocaleString()} remaining (Limit: ${symbol}${b.monthlyLimit.toLocaleString()}, ${pct}% used)`;
            }).join('\n');
        }
      }
      break;
    }

    case 'budget_closest_limit': {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const budgets = await Budget.find({ userId, month, year }).lean();
      if (budgets.length === 0) {
        responseText = `You have no budgets set for this month. 📊`;
      } else {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 1);
        const expensesAgg = await Expense.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
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

        let closestBudget = null;
        let maxPct = -1;

        budgets.forEach(b => {
          const spent = spentMap[b.category] || 0;
          const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
          if (pct > maxPct) {
            maxPct = pct;
            closestBudget = { ...b, spent, pct };
          }
        });

        if (closestBudget) {
          const catName = closestBudget.category.charAt(0).toUpperCase() + closestBudget.category.slice(1);
          const remaining = closestBudget.monthlyLimit - closestBudget.spent;
          responseText = `Your ${catName} Budget is closest to its limit at ${Math.round(closestBudget.pct)}% utilization.\n\n${symbol}${remaining.toLocaleString()} remains of your ${symbol}${closestBudget.monthlyLimit.toLocaleString()} limit.`;
        } else {
          responseText = `You don't have any budgets set for this month.`;
        }
      }
      break;
    }

    case 'overspending_status': {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 1);

      // Check incomes and expenses for the month
      const [incomeAgg] = await Income.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
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

      const [expenseAgg] = await Expense.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
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

      const monthlyIncome = incomeAgg?.total || 0;
      const monthlyExpenses = expenseAgg?.total || 0;

      // Check budgets
      const budgets = await Budget.find({ userId, month, year }).lean();
      const expensesAgg = await Expense.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
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

      const exceededBudgets = [];
      budgets.forEach(b => {
        const spent = spentMap[b.category] || 0;
        if (spent > b.monthlyLimit) {
          const catName = b.category.charAt(0).toUpperCase() + b.category.slice(1);
          exceededBudgets.push(`${catName} (exceeded by ${symbol}${(spent - b.monthlyLimit).toLocaleString()})`);
        }
      });

      if (exceededBudgets.length > 0) {
        responseText = `Yes, you are overspending in the following categories:\n` +
          exceededBudgets.map(eb => `• ${eb}`).join('\n') +
          `\n\nTotal monthly spending is ${symbol}${monthlyExpenses.toLocaleString()} compared to an income of ${symbol}${monthlyIncome.toLocaleString()}. Try trimming down non-essential costs! ⚠️`;
      } else if (monthlyExpenses > monthlyIncome && monthlyIncome > 0) {
        responseText = `Warning: Your total monthly expenses (${symbol}${monthlyExpenses.toLocaleString()}) exceed your total income (${symbol}${monthlyIncome.toLocaleString()}) by ${symbol}${(monthlyExpenses - monthlyIncome).toLocaleString()}.\n\nAlthough your category budgets aren't exceeded yet, your overall balance is in the red. ⚠️`;
      } else {
        responseText = `Looking good! You are not overspending this month. 🎉\n\nYour total expenses (${symbol}${monthlyExpenses.toLocaleString()}) are within your income (${symbol}${monthlyIncome.toLocaleString()}), and no category budgets have been exceeded. Keep it up!`;
      }
      break;
    }

    case 'monthly_spending': {
      const spent = await smartInsightsService.getMonthlySpending(userId);
      const topCat = await smartInsightsService.getTopCategory(userId);
      const comparison = await smartInsightsService.getMonthlyComparison(userId);
      
      responseText = `You spent ${symbol}${spent.toLocaleString()} this month.`;
      
      if (topCat) {
        const catName = topCat._id.charAt(0).toUpperCase() + topCat._id.slice(1);
        responseText += `\nYour largest category was ${catName} (${symbol}${topCat.total.toLocaleString()}).`;
      }
      
      if (comparison.lastTotal > 0 && comparison.percentChange > 0) {
        if (comparison.direction === 'lower') {
          responseText += `\nThat's ${comparison.percentChange}% lower than last month 🎉`;
        } else {
          responseText += `\nThat's ${comparison.percentChange}% higher than last month 📈`;
        }
      }
      break;
    }

    case 'weekly_spending': {
      const spent = await smartInsightsService.getWeeklySpending(userId);
      responseText = `You spent ${symbol}${spent.toLocaleString()} this week.\nKeep tracking to stay on top of your budget! 📊`;
      break;
    }

    case 'food_spending': {
      const spent = await smartInsightsService.getCategorySpending(userId, 'food');
      responseText = `You spent ${symbol}${spent.toLocaleString()} on Food this month 🍔\nEating out less is a great way to save money!`;
      break;
    }

    case 'travel_spending': {
      const spent = await smartInsightsService.getCategorySpending(userId, 'travel');
      responseText = `You spent ${symbol}${spent.toLocaleString()} on Travel this month 🚗\nKeep an eye on ride-sharing and transport costs!`;
      break;
    }

    case 'shopping_spending': {
      const spent = await smartInsightsService.getCategorySpending(userId, 'shopping');
      responseText = `You spent ${symbol}${spent.toLocaleString()} on Shopping this month 🛍️\nMake sure to stick to your wishlist!`;
      break;
    }

    case 'category_spending': {
      const categories = await smartInsightsService.getCategorySpending(userId);
      if (categories.length === 0) {
        responseText = `You haven't recorded any category spending this month yet. 💸`;
      } else {
        responseText = `Here is your category breakdown this month:\n\n` +
          categories.map(c => `• ${c._id.charAt(0).toUpperCase() + c._id.slice(1)}: ${symbol}${c.total.toLocaleString()}`).join('\n');
      }
      break;
    }

    case 'largest_expense': {
      const largest = await smartInsightsService.getLargestExpense(userId);
      if (largest) {
        responseText = `Your biggest expense this month was:\n\n${largest.title}\n${symbol}${largest.amount.toLocaleString()}\n${formatDate(largest.date)}`;
      } else {
        responseText = `You have no expense transactions logged for this month. 📈`;
      }
      break;
    }

    case 'recent_expenses': {
      const recent = await smartInsightsService.getRecentExpenses(userId, 5);
      if (recent.length === 0) {
        responseText = `You don't have any recent expense logs. 📊`;
      } else {
        responseText = `Your most recent expenses:\n\n` +
          recent.map(e => `• ${e.title}: ${symbol}${e.amount.toLocaleString()} (${formatDate(e.date)})`).join('\n');
      }
      break;
    }

    case 'income_summary': {
      const income = await smartInsightsService.getMonthlyIncome(userId);
      responseText = `Your total income this month is ${symbol}${income.toLocaleString()} 💰\nMake sure to allocate some to savings!`;
      break;
    }

    case 'savings_summary': {
      const income = await smartInsightsService.getMonthlyIncome(userId);
      const expenses = await smartInsightsService.getMonthlySpending(userId);
      const savings = income - expenses;
      
      responseText = `Income: ${symbol}${income.toLocaleString()}\nExpenses: ${symbol}${expenses.toLocaleString()}\nSavings: ${symbol}${savings.toLocaleString()}\n\n`;
      if (savings > 0) {
        responseText += `Nice work 🎉`;
      } else if (savings === 0) {
        responseText += `You are spending exactly what you make. Try to set aside some savings! 💰`;
      } else {
        responseText += `Watch out for overspending ⚠️`;
      }
      break;
    }

    case 'streak_info': {
      const streak = await smartInsightsService.getCurrentStreak(userId);
      if (streak.currentStreak > 0) {
        responseText = `You're currently on a ${streak.currentStreak}-day tracking streak 🔥\nKeep it going!`;
      } else {
        responseText = `No active streak right now. Log your first activity today to start! 🚀`;
      }
      break;
    }

    case 'reflection_summary': {
      const summary = await smartInsightsService.getReflectionSummary(userId);
      responseText = `Here is your reflection summary for this month:\n\n` +
        `• Controlled: ${summary.moodCounts.controlled} days 😊\n` +
        `• Average: ${summary.moodCounts.average} days 😐\n` +
        `• Overspent: ${summary.moodCounts.overspent} days ⚠️\n\n`;
      
      if (summary.moodCounts.controlled > summary.moodCounts.overspent) {
        responseText += `Great job keeping your spending controlled! 🌟`;
      } else if (summary.moodCounts.overspent > 0) {
        responseText += `You tend to feel overspent on some days. Try analyzing what triggers those expenses. 💡`;
      }
      break;
    }

    case 'monthly_comparison': {
      const comparison = await smartInsightsService.getMonthlyComparison(userId);
      responseText = `This Month: ${symbol}${comparison.currentTotal.toLocaleString()}\nLast Month: ${symbol}${comparison.lastTotal.toLocaleString()}\n\n`;
      if (comparison.lastTotal > 0) {
        responseText += `Your spending is ${comparison.percentChange}% ${comparison.direction} compared to last month!`;
      } else {
        responseText += `No spending records for last month yet. Keep tracking to build comparison history! 📊`;
      }
      break;
    }

    case 'help': {
      responseText = `I'm Fynn, your personal finance buddy inside Fyno! 😊\n\nI can currently help with:\n` +
        `• Spending: 'how much did I spend this week?'\n` +
        `• Income: 'what is my income?'\n` +
        `• Savings: 'did I save money?'\n` +
        `• Categories: 'show category breakdown'\n` +
        `• Streaks: 'how is my streak?'\n` +
        `• Reflections: 'show mood reflections'\n` +
        `• Fyno Features: 'what can you do?'`;
      break;
    }

    case 'unknown':
    default: {
      responseText = `I'm not sure about that yet 😊\n\nI can currently help with:\n` +
        `• Spending\n` +
        `• Income\n` +
        `• Savings\n` +
        `• Categories\n` +
        `• Streaks\n` +
        `• Reflections\n` +
        `• Fyno Features`;
      break;
    }
  }

  // Persist the conversation
  await FynnConversation.create({
    userId,
    message,
    intent,
    response: responseText,
  });

  return {
    response: responseText,
    intent,
  };
};

module.exports = { generateFynnResponse };
