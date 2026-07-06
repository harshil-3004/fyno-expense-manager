const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
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
} = require('../controllers/fynnController');

/**
 * Fynn Companion Routing (Phase 3)
 * All endpoints are mounted at /api/fynn/* and require authentication.
 */

router.get('/summary', protect, getFynnSummary);
router.get('/spending', protect, getFynnSpending);
router.get('/categories', protect, getFynnCategories);
router.get('/streak', protect, getFynnStreak);
router.get('/reflections', protect, getFynnReflections);
router.get('/insights', protect, getFynnInsights);
router.get('/history', protect, getFynnHistory);
router.delete('/history', protect, clearFynnHistory);
router.get('/review/weekly', protect, getWeeklyReview);
router.get('/review/monthly', protect, getMonthlyReview);
router.get('/idempotency/:requestId', protect, checkIdempotency);
router.post('/chat', protect, chatFynn);

// Memory Management APIs
router.get('/memory', protect, getFynnMemories);
router.put('/memory/:id', protect, updateFynnMemory);
router.delete('/memory/:id', protect, deleteFynnMemory);
router.delete('/memory', protect, clearFynnMemories);

module.exports = router;
