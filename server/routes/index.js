const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/expenses', require('./expense.routes'));
router.use('/income', require('./income.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/fynn', require('./fynnRoutes'));
router.use('/budgets', require('./budget.routes'));
router.use('/goals', require('./goal.routes'));

module.exports = router;
