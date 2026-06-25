const { body } = require('express-validator');
const { GOAL_TYPES } = require('../models/Goal');

const goalValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Goal title is required')
    .isLength({ max: 100 })
    .withMessage('Goal title cannot exceed 100 characters'),

  body('type')
    .notEmpty()
    .withMessage('Goal type is required')
    .isIn(GOAL_TYPES)
    .withMessage('Invalid goal type'),

  body('targetAmount')
    .notEmpty()
    .withMessage('Target amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Target amount must be greater than 0'),

  body('currentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current savings amount cannot be negative')
    .custom((value, { req }) => {
      if (value !== undefined && parseFloat(value) > parseFloat(req.body.targetAmount)) {
        throw new Error('Current savings amount cannot exceed target amount');
      }
      return true;
    }),

  body('targetDate')
    .notEmpty()
    .withMessage('Target date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
];

module.exports = { goalValidation };
