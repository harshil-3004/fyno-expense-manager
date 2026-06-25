import api from './api';

const goalService = {
  create: (data) => api.post('/goals', data),
  getAll: (params) => api.get('/goals', { params }),
  getById: (id) => api.get(`/goals/${id}`),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
};

export default goalService;
