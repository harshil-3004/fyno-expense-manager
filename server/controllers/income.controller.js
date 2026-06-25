const { validationResult } = require('express-validator');
const Income = require('../models/Income');
const asyncHandler = require('../middleware/asyncHandler');
const { updateStreak } = require('../services/streak.service');

/**
 * @desc    Create income
 * @route   POST /api/income
 * @access  Private
 */
const createIncome = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const income = await Income.create({
    userId: req.user._id,
    ...req.body,
  });

  // Update tracking streak
  await updateStreak(req.user._id);

  res.status(201).json(income);
});

/**
 * @desc    Get all income (paginated, filterable, sortable)
 * @route   GET /api/income
 * @access  Private
 */
const getIncomes = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    startDate,
    endDate,
    sort = '-date',
    search,
    source,
  } = req.query;

  const query = { userId: req.user._id };

  if (source) {
    query.source = source;
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  if (search) {
    query.sourceName = { $regex: search, $options: 'i' };
  }

  const total = await Income.countDocuments(query);
  const incomes = await Income.find(query)
    .sort(sort)
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.json({
    incomes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Update income
 * @route   PUT /api/income/:id
 * @access  Private
 */
const updateIncome = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const income = await Income.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!income) {
    return res.status(404).json({ message: 'Income not found' });
  }

  res.json(income);
});

/**
 * @desc    Delete income
 * @route   DELETE /api/income/:id
 * @access  Private
 */
const deleteIncome = asyncHandler(async (req, res) => {
  const income = await Income.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!income) {
    return res.status(404).json({ message: 'Income not found' });
  }

  res.json({ message: 'Income removed' });
});

module.exports = {
  createIncome,
  getIncomes,
  updateIncome,
  deleteIncome,
};
