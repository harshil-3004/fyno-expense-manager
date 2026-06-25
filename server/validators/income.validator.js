const { body } = require('express-validator');

const SOURCES = ['manual', 'sms', 'notification', 'ocr', 'voice', 'ai'];

const incomeValidation = [
  body('sourceName')
    .trim()
    .notEmpty()
    .withMessage('Income source is required')
    .isLength({ max: 100 })
    .withMessage('Source name cannot exceed 100 characters'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),

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

module.exports = { incomeValidation };
