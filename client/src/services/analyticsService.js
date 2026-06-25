import api from './api';

const analyticsService = {
  getMonthly: (timeframe = 'monthly') => api.get('/analytics/monthly', { params: { timeframe } }),
  getCategory: (period) => api.get('/analytics/category', { params: { period } }),
  getIncomeExpense: () => api.get('/analytics/income-expense'),
  getInsights: () => api.get('/analytics/insights'),
  getPlanning: () => api.get('/analytics/planning'),
};

export default analyticsService;
