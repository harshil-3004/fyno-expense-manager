import api from './api';

const budgetService = {
  create: (data) => api.post('/budgets', data),
  getAll: (params) => api.get('/budgets', { params }),
  getById: (id) => api.get(`/budgets/${id}`),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
};

export default budgetService;
