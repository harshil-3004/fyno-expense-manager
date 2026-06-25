const mongoose = require('mongoose');

const GOAL_TYPES = ['Savings', 'Travel', 'Purchase', 'Emergency Fund', 'Custom'];

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [100, 'Goal title cannot exceed 100 characters'],
    },
    type: {
      type: String,
      required: [true, 'Goal type is required'],
      enum: {
        values: GOAL_TYPES,
        message: '{VALUE} is not a valid goal type',
      },
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [0.01, 'Target amount must be greater than 0'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
      validate: {
        validator: function (value) {
          // If 'this' is a query (e.g. for findOneAndUpdate)
          if (this && typeof this.getUpdate === 'function') {
            const update = this.getUpdate();
            const targetAmount = (update.$set && update.$set.targetAmount !== undefined)
              ? update.$set.targetAmount
              : update.targetAmount;

            if (targetAmount !== undefined) {
              return value <= targetAmount;
            }

            // Fallback: Fetch document if targetAmount is not in the update payload
            return this.model.findOne(this.getQuery()).then((doc) => {
              if (!doc) return true;
              return value <= doc.targetAmount;
            });
          }
          // Otherwise, normal document validation (for save/create)
          return value <= this.targetAmount;
        },
        message: 'Current savings amount cannot exceed the target amount',
      },
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
goalSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Goal', goalSchema);
module.exports.GOAL_TYPES = GOAL_TYPES;
