const mongoose = require('mongoose');

const fynnStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    lastTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    lastTransactionType: {
      type: String,
      enum: ['expense', 'income'],
      required: false,
    },
    lastAmount: {
      type: Number,
      required: false,
    },
    lastCategory: {
      type: String,
      required: false,
    },
    lastDescription: {
      type: String,
      required: false,
    },
    pendingAction: {
      type: {
        type: String, // 'awaiting_delete_confirmation', 'awaiting_update_confirmation', 'awaiting_transaction_selection', 'awaiting_amount', 'awaiting_category'
        required: false
      },
      data: {
        type: mongoose.Schema.Types.Mixed,
        required: false
      },
      expiresAt: {
        type: Date,
        required: false
      }
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FynnState', fynnStateSchema);
