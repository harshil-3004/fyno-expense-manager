const mongoose = require('mongoose');

const dailyReflectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mood: {
      type: String,
      required: [true, 'Mood is required'],
      enum: {
        values: ['controlled', 'average', 'overspent'],
        message: '{VALUE} is not a valid mood',
      },
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, 'Note cannot exceed 300 characters'],
    },
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One reflection per user per day
dailyReflectionSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyReflection', dailyReflectionSchema);
