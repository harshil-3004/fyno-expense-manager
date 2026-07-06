const mongoose = require('mongoose');

const fynnMemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['preferences', 'goal', 'profile', 'fact'],
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
    importance: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to prevent duplicate entries for same user key/category
fynnMemorySchema.index({ userId: 1, category: 1, key: 1 }, { unique: true });
fynnMemorySchema.index({ userId: 1, lastUsedAt: -1 });

module.exports = mongoose.model('FynnMemory', fynnMemorySchema);
