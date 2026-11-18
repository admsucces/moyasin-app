import ApiService from './api';

export const receivableService = {
  getReceivables: async (params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return ApiService.get(`/receivables${queryString}`);
  },

  getReceivable: async (id) => {
    return ApiService.get(`/receivables/${id}`);
  },

  createReceivable: async (data) => {
    return ApiService.post('/receivables', data);
  },

  updateReceivable: async (id, data) => {
    return ApiService.put(`/receivables/${id}`, data);
  },

  deleteReceivable: async (id) => {
    return ApiService.delete(`/receivables/${id}`);
  },

  receiveReceivable: async (id, data) => {
    return ApiService.post(`/receivables/${id}/receive`, data);
  }
};

export default receivableService;
