import ApiService from './api';

export const transactionService = {
  getTransactions: async (params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return ApiService.get(`/transactions${queryString}`);
  },

  getTransaction: async (id) => {
    return ApiService.get(`/transactions/${id}`);
  },

  createIncome: async (data) => {
    return ApiService.post('/transactions/income', data);
  },

  updateIncome: async (id, data) => {
    return ApiService.put(`/transactions/income/${id}`, data);
  },

  createExpense: async (data) => {
    return ApiService.post('/transactions/expense', data);
  },

  updateExpense: async (id, data) => {
    return ApiService.put(`/transactions/expense/${id}`, data);
  },

  submitTransaction: async (id) => {
    return ApiService.post(`/transactions/${id}/submit`, {});
  },

  uploadAttachment: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return ApiService.upload(`/transactions/${id}/attachments`, formData);
  },

  deleteTransaction: async (id) => {
    return ApiService.delete(`/transactions/${id}`);
  },
};
