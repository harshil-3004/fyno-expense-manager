const router = require('express').Router();
const {
  createIncome,
  getIncomes,
  updateIncome,
  deleteIncome,
} = require('../controllers/income.controller');
const { protect } = require('../middleware/auth');
const { incomeValidation } = require('../validators/income.validator');

router.use(protect);

router.route('/')
  .post(incomeValidation, createIncome)
  .get(getIncomes);

router.route('/:id')
  .put(incomeValidation, updateIncome)
  .delete(deleteIncome);

module.exports = router;
