const router = require('express').Router();
const {
  getMonthlySpending,
  getCategoryBreakdown,
  getIncomeExpenseTrend,
  getInsights,
  getPlanningOverview,
} = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/monthly', getMonthlySpending);
router.get('/category', getCategoryBreakdown);
router.get('/income-expense', getIncomeExpenseTrend);
router.get('/insights', getInsights);
router.get('/planning', getPlanningOverview);

module.exports = router;
