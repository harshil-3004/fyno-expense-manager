const TrackingStreak = require('../models/TrackingStreak');

/**
 * Update tracking streak for a user.
 * Called when a meaningful financial activity occurs:
 * - Adding expense
 * - Adding income
 * - Submitting daily reflection
 */
const updateStreak = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = await TrackingStreak.findOne({ userId });

  if (!streak) {
    // First ever activity
    streak = await TrackingStreak.create({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastTrackedDate: today,
    });
    return streak;
  }

  const lastTracked = streak.lastTrackedDate
    ? new Date(streak.lastTrackedDate)
    : null;

  if (lastTracked) {
    lastTracked.setHours(0, 0, 0, 0);
  }

  // Already tracked today
  if (lastTracked && lastTracked.getTime() === today.getTime()) {
    return streak;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastTracked && lastTracked.getTime() === yesterday.getTime()) {
    // Consecutive day — extend streak
    streak.currentStreak += 1;
  } else {
    // Gap > 1 day — reset streak
    streak.currentStreak = 1;
  }

  // Update longest streak
  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  streak.lastTrackedDate = today;
  await streak.save();

  return streak;
};

/**
 * Get tracking streak for a user.
 */
const getStreak = async (userId) => {
  const streak = await TrackingStreak.findOne({ userId });

  if (!streak) {
    return { currentStreak: 0, longestStreak: 0, lastTrackedDate: null };
  }

  // Check if streak is still active (last tracked was today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastTracked = streak.lastTrackedDate
    ? new Date(streak.lastTrackedDate)
    : null;

  if (lastTracked) {
    lastTracked.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Streak is broken if last tracked is before yesterday
    if (lastTracked.getTime() < yesterday.getTime()) {
      streak.currentStreak = 0;
      await streak.save();
    }
  }

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastTrackedDate: streak.lastTrackedDate,
  };
};

module.exports = { updateStreak, getStreak };
