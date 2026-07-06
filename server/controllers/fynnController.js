const asyncHandler = require('../middleware/asyncHandler');
const fynnService = require('../services/fynnService');
const fynnAIService = require('../services/ai/FynnAIService');
const smartInsightsService = require('../services/smartInsightsService');
const FynnConversation = require('../models/FynnConversation');

/**
 * Fynn Companion Controller (Phase 3)
 * Handles HTTP request mapping for all /api/fynn/ endpoints.
 */

// @desc    Get monthly financial summary
// @route   GET /api/fynn/summary
// @access  Private
const getFynnSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const income = await smartInsightsService.getMonthlyIncome(userId);
  const expenses = await smartInsightsService.getMonthlySpending(userId);
  const savings = await smartInsightsService.getSavings(userId);
  const topCategory = await smartInsightsService.getTopCategory(userId);

  res.json({
    income,
    expenses,
    savings,
    topCategory,
  });
});

// @desc    Get monthly & weekly spending aggregates
// @route   GET /api/fynn/spending
// @access  Private
const getFynnSpending = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const weekly = await smartInsightsService.getWeeklySpending(userId);
  const monthly = await smartInsightsService.getMonthlySpending(userId);

  res.json({
    weekly,
    monthly,
  });
});

// @desc    Get breakdown of spending by category
// @route   GET /api/fynn/categories
// @access  Private
const getFynnCategories = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const categories = await smartInsightsService.getCategorySpending(userId);
  res.json(categories);
});

// @desc    Get tracking streak info
// @route   GET /api/fynn/streak
// @access  Private
const getFynnStreak = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const streak = await smartInsightsService.getCurrentStreak(userId);
  res.json(streak);
});

// @desc    Get reflection summary (mood counts)
// @route   GET /api/fynn/reflections
// @access  Private
const getFynnReflections = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const reflections = await smartInsightsService.getReflectionSummary(userId);
  res.json(reflections);
});

// @desc    Get proactive smart insights
// @route   GET /api/fynn/insights
// @access  Private
const getFynnInsights = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const insights = await smartInsightsService.generateDynamicInsights(userId);
  res.json(insights);
});

// @desc    Get past chat history
// @route   GET /api/fynn/history
// @access  Private
const getFynnHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const history = await FynnConversation.find({ userId })
    .sort({ createdAt: 1 }) // Chronological order for messages list
    .limit(50);
  res.json(history);
});

// @desc    Post chat message to Fynn AI Companion
// @route   POST /api/fynn/chat
// @access  Private
const chatFynn = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { message, requestId } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ message: 'Message text is required' });
  }

  const result = await fynnAIService.generateResponse(userId, message, requestId);
  res.json(result);
});

// @desc    Get weekly financial AI review
// @route   GET /api/fynn/review/weekly
// @access  Private
const getWeeklyReview = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const review = await fynnAIService.getWeeklyReview(userId);
  res.json(review);
});

// @desc    Get monthly financial AI review
// @route   GET /api/fynn/review/monthly
// @access  Private
const getMonthlyReview = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const review = await fynnAIService.getMonthlyReview(userId);
  res.json(review);
});

// @desc    Clear chat history and state
// @route   DELETE /api/fynn/history
// @access  Private
const clearFynnHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await FynnConversation.deleteMany({ userId });
  
  // Clean up FynnState
  const FynnState = require('../models/FynnState');
  await FynnState.deleteOne({ userId });

  res.json({ message: 'Conversation and state deleted successfully' });
});

// @desc    Check if a specific requestId has already been successfully processed
// @route   GET /api/fynn/idempotency/:requestId
// @access  Private
const checkIdempotency = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { requestId } = req.params;

  const FynnIdempotency = require('../models/FynnIdempotency');
  const cached = await FynnIdempotency.findOne({ userId, requestId });

  if (cached && cached.status === 'completed') {
    return res.json({
      completed: true,
      response: cached.response
    });
  }

  res.json({
    completed: false
  });
});

// @desc    Get all user memories
// @route   GET /api/fynn/memory
// @access  Private
const getFynnMemories = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const FynnMemory = require('../models/FynnMemory');
  const memories = await FynnMemory.find({ userId }).sort({ createdAt: -1 });
  res.json(memories);
});

// @desc    Update a specific memory's value
// @route   PUT /api/fynn/memory/:id
// @access  Private
const updateFynnMemory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;
  const { value } = req.body;

  if (!value || value.trim() === '') {
    return res.status(400).json({ message: 'Value is required' });
  }

  const FynnMemory = require('../models/FynnMemory');
  const memory = await FynnMemory.findOneAndUpdate(
    { _id: id, userId },
    { value: value.trim() },
    { new: true }
  );

  if (!memory) {
    return res.status(404).json({ message: 'Memory not found' });
  }

  res.json(memory);
});

// @desc    Delete a specific memory
// @route   DELETE /api/fynn/memory/:id
// @access  Private
const deleteFynnMemory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const FynnMemory = require('../models/FynnMemory');
  const memory = await FynnMemory.findOneAndDelete({ _id: id, userId });

  if (!memory) {
    return res.status(404).json({ message: 'Memory not found' });
  }

  res.json({ message: 'Memory deleted successfully' });
});

// @desc    Clear all memories for the user
// @route   DELETE /api/fynn/memory
// @access  Private
const clearFynnMemories = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const FynnMemory = require('../models/FynnMemory');
  await FynnMemory.deleteMany({ userId });
  res.json({ message: 'All memories deleted successfully' });
});

module.exports = {
  getFynnSummary,
  getFynnSpending,
  getFynnCategories,
  getFynnStreak,
  getFynnReflections,
  getFynnInsights,
  getFynnHistory,
  chatFynn,
  getWeeklyReview,
  getMonthlyReview,
  clearFynnHistory,
  checkIdempotency,
  getFynnMemories,
  updateFynnMemory,
  deleteFynnMemory,
  clearFynnMemories,
};
