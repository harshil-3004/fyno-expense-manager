const { validationResult } = require('express-validator');
const Goal = require('../models/Goal');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get all goals
 * @route   GET /api/goals
 * @access  Private
 */
const getGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(goals);
});

/**
 * @desc    Get single goal
 * @route   GET /api/goals/:id
 * @access  Private
 */
const getGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!goal) {
    return res.status(404).json({ message: 'Goal not found' });
  }

  res.json(goal);
});

/**
 * @desc    Create new savings goal
 * @route   POST /api/goals
 * @access  Private
 */
const createGoal = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const goal = await Goal.create({
    userId: req.user._id,
    ...req.body,
  });

  res.status(201).json(goal);
});

/**
 * @desc    Update goal details or increment savings amount
 * @route   PUT /api/goals/:id
 * @access  Private
 */
const updateGoal = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ updateGoal validation failed. Body:', req.body);
    console.log('❌ Errors:', errors.array());
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!goal) {
    return res.status(404).json({ message: 'Goal not found' });
  }

  res.json(goal);
});

/**
 * @desc    Delete goal
 * @route   DELETE /api/goals/:id
 * @access  Private
 */
const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!goal) {
    return res.status(404).json({ message: 'Goal not found' });
  }

  res.json({ message: 'Goal removed' });
});

module.exports = {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
};
