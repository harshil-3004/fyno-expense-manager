import api from './api';

const incomeService = {
  create: (data) => api.post('/income', data),
  getAll: (params) => api.get('/income', { params }),
  update: (id, data) => api.put(`/income/${id}`, data),
  delete: (id) => api.delete(`/income/${id}`),
};

export default incomeService;
