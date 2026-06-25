const { body } = require('express-validator');
const { CATEGORIES } = require('../models/Budget');

const budgetValidation = [
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(CATEGORIES)
    .withMessage('Invalid category'),

  body('monthlyLimit')
    .notEmpty()
    .withMessage('Monthly limit is required')
    .isFloat({ min: 0.01 })
    .withMessage('Monthly limit must be greater than 0'),

  body('month')
    .notEmpty()
    .withMessage('Month is required')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),

  body('year')
    .notEmpty()
    .withMessage('Year is required')
    .isInt({ min: 2000 })
    .withMessage('Year must be a valid number'),
];

module.exports = { budgetValidation };
