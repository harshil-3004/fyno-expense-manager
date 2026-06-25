const { validationResult } = require('express-validator');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const asyncHandler = require('../middleware/asyncHandler');
const mongoose = require('mongoose');

/**
 * @desc    Get all budgets with dynamic spending calculation
 * @route   GET /api/budgets
 * @access  Private
 */
const getBudgets = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
  const year = parseInt(req.query.year) || new Date().getFullYear();

  const budgets = await Budget.find({ userId, month, year }).lean();

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 1);

  // Aggregate expenses for the given month
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

  const budgetsWithSpending = budgets.map((b) => {
    const spent = spentMap[b.category] || 0;
    const remaining = b.monthlyLimit - spent;
    const usagePercentage = b.monthlyLimit > 0 ? parseFloat(((spent / b.monthlyLimit) * 100).toFixed(1)) : 0;
    
    let status = 'Safe';
    if (usagePercentage >= 100) {
      status = 'Exceeded';
    } else if (usagePercentage >= 75) {
      status = 'Warning';
    }

    return {
      ...b,
      spent,
      remaining,
      usagePercentage,
      status,
    };
  });

  res.json(budgetsWithSpending);
});

/**
 * @desc    Get a single budget with dynamic spending
 * @route   GET /api/budgets/:id
 * @access  Private
 */
const getBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id }).lean();

  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }

  const startOfMonth = new Date(budget.year, budget.month - 1, 1);
  const endOfMonth = new Date(budget.year, budget.month, 1);

  const [expenseAgg] = await Expense.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(req.user._id),
        category: budget.category,
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

  const spent = expenseAgg?.totalSpent || 0;
  const remaining = budget.monthlyLimit - spent;
  const usagePercentage = budget.monthlyLimit > 0 ? parseFloat(((spent / budget.monthlyLimit) * 100).toFixed(1)) : 0;
  
  let status = 'Safe';
  if (usagePercentage >= 100) {
    status = 'Exceeded';
  } else if (usagePercentage >= 75) {
    status = 'Warning';
  }

  res.json({
    ...budget,
    spent,
    remaining,
    usagePercentage,
    status,
  });
});

/**
 * @desc    Create new budget
 * @route   POST /api/budgets
 * @access  Private
 */
const createBudget = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { category, monthlyLimit, month, year } = req.body;
  const userId = req.user._id;

  // Check unique category per month per user constraint
  const existingBudget = await Budget.findOne({ userId, category, month, year });
  if (existingBudget) {
    return res.status(400).json({ message: `A budget for category '${category}' already exists for this month.` });
  }

  const budget = await Budget.create({
    userId,
    category,
    monthlyLimit,
    month,
    year,
  });

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 1);

  const [expenseAgg] = await Expense.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        category,
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

  const spent = expenseAgg?.totalSpent || 0;
  const remaining = monthlyLimit - spent;
  const usagePercentage = monthlyLimit > 0 ? parseFloat(((spent / monthlyLimit) * 100).toFixed(1)) : 0;
  
  let status = 'Safe';
  if (usagePercentage >= 100) {
    status = 'Exceeded';
  } else if (usagePercentage >= 75) {
    status = 'Warning';
  }

  res.status(201).json({
    ...budget.toObject(),
    spent,
    remaining,
    usagePercentage,
    status,
  });
});

/**
 * @desc    Update budget
 * @route   PUT /api/budgets/:id
 * @access  Private
 */
const updateBudget = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { category, monthlyLimit, month, year } = req.body;
  const userId = req.user._id;

  // Check if updating to a category/month/year that already exists elsewhere
  if (category || month || year) {
    const budgetToUpdate = await Budget.findOne({ _id: req.params.id, userId });
    if (!budgetToUpdate) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    const checkCategory = category || budgetToUpdate.category;
    const checkMonth = month || budgetToUpdate.month;
    const checkYear = year || budgetToUpdate.year;

    const existingBudget = await Budget.findOne({
      userId,
      category: checkCategory,
      month: checkMonth,
      year: checkYear,
      _id: { $ne: req.params.id },
    });

    if (existingBudget) {
      return res.status(400).json({ message: `A budget for category '${checkCategory}' already exists for this month.` });
    }
  }

  const budget = await Budget.findOneAndUpdate(
    { _id: req.params.id, userId },
    req.body,
    { new: true, runValidators: true }
  );

  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }

  const budgetObj = budget.toObject();
  const startOfMonth = new Date(budgetObj.year, budgetObj.month - 1, 1);
  const endOfMonth = new Date(budgetObj.year, budgetObj.month, 1);

  const [expenseAgg] = await Expense.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        category: budgetObj.category,
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

  const spent = expenseAgg?.totalSpent || 0;
  const remaining = budgetObj.monthlyLimit - spent;
  const usagePercentage = budgetObj.monthlyLimit > 0 ? parseFloat(((spent / budgetObj.monthlyLimit) * 100).toFixed(1)) : 0;
  
  let status = 'Safe';
  if (usagePercentage >= 100) {
    status = 'Exceeded';
  } else if (usagePercentage >= 75) {
    status = 'Warning';
  }

  res.json({
    ...budgetObj,
    spent,
    remaining,
    usagePercentage,
    status,
  });
});

/**
 * @desc    Delete budget
 * @route   DELETE /api/budgets/:id
 * @access  Private
 */
const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }

  res.json({ message: 'Budget removed' });
});

module.exports = {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
};
