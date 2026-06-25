/**
 * Returns a time-based greeting.
 */
export const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/**
 * Check if it's evening (for showing daily reflection card).
 * Shows after 6 PM.
 */
export const isEvening = () => {
  return new Date().getHours() >= 18;
};
