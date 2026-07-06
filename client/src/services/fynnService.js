import api from './api';

/**
 * Fynn Client Service (Phase 2)
 * Connects the mobile app to the /api/fynn/* backend endpoints.
 */
const fynnService = {
  getSummary: () => api.get('/fynn/summary'),
  getSpending: () => api.get('/fynn/spending'),
  getCategories: () => api.get('/fynn/categories'),
  getStreak: () => api.get('/fynn/streak'),
  getReflections: () => api.get('/fynn/reflections'),
  getInsights: () => api.get('/fynn/insights'),
  getHistory: () => api.get('/fynn/history'),
  clearHistory: () => api.delete('/fynn/history'),
  chat: (message, requestId) => api.post('/fynn/chat', { message, requestId }),
  getWeeklyReview: () => api.get('/fynn/review/weekly'),
  getMonthlyReview: () => api.get('/fynn/review/monthly'),
  checkIdempotency: (requestId) => api.get(`/fynn/idempotency/${requestId}`),
};

export default fynnService;
