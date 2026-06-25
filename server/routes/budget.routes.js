const router = require('express').Router();
const {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
} = require('../controllers/budget.controller');
const { protect } = require('../middleware/auth');
const { budgetValidation } = require('../validators/budget.validator');

router.use(protect);

router.route('/')
  .get(getBudgets)
  .post(budgetValidation, createBudget);

router.route('/:id')
  .get(getBudget)
  .put(budgetValidation, updateBudget)
  .delete(deleteBudget);

module.exports = router;
