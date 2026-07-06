const mongoose = require('mongoose');

const fynnHabitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['subscription', 'bill', 'income', 'groceries', 'fuel', 'other'],
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    confidence: {
      type: Number,
      default: 1.0,
    },
    lastInferredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to prevent duplicate entries for same type/key
fynnHabitSchema.index({ userId: 1, type: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('FynnHabit', fynnHabitSchema);
