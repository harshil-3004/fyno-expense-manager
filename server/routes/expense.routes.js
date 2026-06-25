const router = require('express').Router();
const {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expense.controller');
const { protect } = require('../middleware/auth');
const { expenseValidation } = require('../validators/expense.validator');

router.use(protect);

router.route('/')
  .post(expenseValidation, createExpense)
  .get(getExpenses);

router.route('/:id')
  .get(getExpense)
  .put(expenseValidation, updateExpense)
  .delete(deleteExpense);

module.exports = router;
