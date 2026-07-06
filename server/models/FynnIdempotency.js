const mongoose = require('mongoose');

const fynnIdempotencySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'completed',
    },
    transactionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      }
    ],
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3600, // Expires after 1 hour automatically
    },
  },
  {
    timestamps: true,
  }
);

// Ensure compound index for userId + requestId is unique to prevent duplicate entry attempts
fynnIdempotencySchema.index({ userId: 1, requestId: 1 }, { unique: true });

module.exports = mongoose.model('FynnIdempotency', fynnIdempotencySchema);
