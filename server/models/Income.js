const mongoose = require('mongoose');

const SOURCES = ['manual', 'sms', 'notification', 'ocr', 'voice', 'ai'];

const incomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sourceName: {
      type: String,
      required: [true, 'Income source is required'],
      trim: true,
      maxlength: [100, 'Source name cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
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
    category: {
      type: String,
      enum: {
        values: ['Salary', 'Investment', 'Transfer', 'Other'],
        message: '{VALUE} is not a valid income category',
      },
      default: 'Other',
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

incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Income', incomeSchema);
