const { validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const asyncHandler = require('../middleware/asyncHandler');
const { updateStreak } = require('../services/streak.service');
const mongoose = require('mongoose');

/**
 * @desc    Create expense
 * @route   POST /api/expenses
 * @access  Private
 */
const createExpense = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const expense = await Expense.create({
    userId: req.user._id,
    ...req.body,
  });

  // Update tracking streak
  await updateStreak(req.user._id);

  res.status(201).json(expense);
});

/**
 * @desc    Get all expenses (paginated, filterable, sortable)
 * @route   GET /api/expenses
 * @access  Private
 */
const getExpenses = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    startDate,
    endDate,
    sort = '-date',
    search,
    source,
  } = req.query;

  const query = { userId: req.user._id };

  // Category filter
  if (category) {
    if (category.includes(',')) {
      query.category = { $in: category.split(',') };
    } else {
      query.category = category;
    }
  }

  // Source filter
  if (source) {
    query.source = source;
  }

  // Date range filter
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Search by title
  if (search) {
    query.title = { $regex: search, $options: 'i' };
  }

  const total = await Expense.countDocuments(query);
  const expenses = await Expense.find(query)
    .sort(sort)
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.json({
    expenses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Get single expense
 * @route   GET /api/expenses/:id
 * @access  Private
 */
const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!expense) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  res.json(expense);
});

/**
 * @desc    Update expense
 * @route   PUT /api/expenses/:id
 * @access  Private
 */
const updateExpense = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!expense) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  res.json(expense);
});

/**
 * @desc    Delete expense
 * @route   DELETE /api/expenses/:id
 * @access  Private
 */
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!expense) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  res.json({ message: 'Expense removed' });
});

module.exports = {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
};
