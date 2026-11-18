import ApiService from './api';

export const payableService = {
  getPayables: async (params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return ApiService.get(`/payables${queryString}`);
  },

  getPayable: async (id) => {
    return ApiService.get(`/payables/${id}`);
  },

  createPayable: async (data) => {
    return ApiService.post('/payables', data);
  },

  updatePayable: async (id, data) => {
    return ApiService.put(`/payables/${id}`, data);
  },

  deletePayable: async (id) => {
    return ApiService.delete(`/payables/${id}`);
  },

  payPayable: async (id, data) => {
    return ApiService.post(`/payables/${id}/pay`, data);
  }
};

export default payableService;
