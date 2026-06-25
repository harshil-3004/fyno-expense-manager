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

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
    },
    monthlyLimit: {
      type: Number,
      required: [true, 'Monthly limit is required'],
      min: [0.01, 'Monthly limit must be greater than 0'],
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [2000, 'Year must be a valid number'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to enforce one budget per category per month per user
budgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });
budgetSchema.index({ userId: 1, month: 1, year: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
module.exports.CATEGORIES = CATEGORIES;
