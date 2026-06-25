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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FynnState', fynnStateSchema);
