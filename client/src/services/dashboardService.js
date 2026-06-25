import api from './api';

const dashboardService = {
  getSummary: () => api.get('/dashboard/summary'),
  submitReflection: (data) => api.post('/dashboard/reflection', data),
  getReflection: () => api.get('/dashboard/reflection'),
};

export default dashboardService;
