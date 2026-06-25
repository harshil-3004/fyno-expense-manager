const { body } = require('express-validator');
const { CATEGORIES, SOURCES } = require('../models/Expense');

const expenseValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(CATEGORIES)
    .withMessage('Invalid category'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('source')
    .optional()
    .isIn(SOURCES)
    .withMessage('Invalid source'),
];

module.exports = { expenseValidation };
