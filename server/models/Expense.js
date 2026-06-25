const mongoose = require('mongoose');

const CATEGORIES = [
  'food',
  'travel',
  'shopping',
  'bills',
  'entertainment',
  'health',
  'education',
  'other',
];

const SOURCES = ['manual', 'sms', 'notification', 'ocr', 'voice', 'ai'];

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    source: {
      type: String,
      enum: SOURCES,
      default: 'manual',
    },
    confidence: {
      type: Number,
      default: 1.0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common query patterns
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });
expenseSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.SOURCES = SOURCES;
