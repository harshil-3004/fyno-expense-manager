const router = require('express').Router();
const {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
} = require('../controllers/goal.controller');
const { protect } = require('../middleware/auth');
const { goalValidation } = require('../validators/goal.validator');

router.use(protect);

router.route('/')
  .get(getGoals)
  .post(goalValidation, createGoal);

router.route('/:id')
  .get(getGoal)
  .put(goalValidation, updateGoal)
  .delete(deleteGoal);

module.exports = router;
