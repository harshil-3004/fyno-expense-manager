const { validationResult } = require('express-validator');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../middleware/asyncHandler');
const mongoose = require('mongoose');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { name, email, password, currency, mobile, avatar } = req.body;

  // Check if user email already exists
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res.status(400).json({ message: 'An account with this email already exists' });
  }

  // Check if user mobile already exists
  const existingMobile = await User.findOne({ mobile });
  if (existingMobile) {
    return res.status(400).json({ message: 'An account with this mobile number already exists' });
  }

  const user = await User.create({
    name,
    email,
    password,
    currency: currency || 'INR',
    mobile,
    avatar: avatar || '',
  });

  const token = generateToken(user._id);

  res.status(201).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      avatar: user.avatar,
      currency: user.currency,
      darkMode: user.darkMode,
      notificationPrefs: user.notificationPrefs,
      createdAt: user.createdAt,
    },
    token,
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = generateToken(user._id);

  res.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      avatar: user.avatar,
      currency: user.currency,
      darkMode: user.darkMode,
      notificationPrefs: user.notificationPrefs,
      createdAt: user.createdAt,
    },
    token,
  });
});

/**
 * @desc    Get user profile with financial totals
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const [expenseTotal] = await Expense.aggregate([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const [incomeTotal] = await Income.aggregate([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const totalExpenses = expenseTotal?.total || 0;
  const totalIncome = incomeTotal?.total || 0;
  const totalSavings = totalIncome - totalExpenses;

  res.json({
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      mobile: req.user.mobile,
      avatar: req.user.avatar,
      currency: req.user.currency,
      darkMode: req.user.darkMode,
      notificationPrefs: req.user.notificationPrefs,
      createdAt: req.user.createdAt,
    },
    financials: {
      totalIncome,
      totalExpenses,
      totalSavings,
    },
  });
});

/**
 * @desc    Update user profile/preferences
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, currency, darkMode, notificationPrefs, mobile, avatar } = req.body;

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (currency !== undefined) updateFields.currency = currency;
  if (darkMode !== undefined) updateFields.darkMode = darkMode;
  if (mobile !== undefined) updateFields.mobile = mobile;
  if (avatar !== undefined) updateFields.avatar = avatar;
  if (notificationPrefs) {
    if (notificationPrefs.dailyReminder !== undefined) {
      updateFields['notificationPrefs.dailyReminder'] = notificationPrefs.dailyReminder;
    }
    if (notificationPrefs.weeklyInsights !== undefined) {
      updateFields['notificationPrefs.weeklyInsights'] = notificationPrefs.weeklyInsights;
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      avatar: user.avatar,
      currency: user.currency,
      darkMode: user.darkMode,
      notificationPrefs: user.notificationPrefs,
      createdAt: user.createdAt,
    },
  });
});

module.exports = { register, login, getProfile, updateProfile };
