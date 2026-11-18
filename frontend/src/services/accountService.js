import ApiService from './api';

export const accountService = {
  async getAccounts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await ApiService.get(`/accounts${query ? `?${query}` : ''}`);
  },

  async createAccount(data) {
    return await ApiService.post('/accounts', data);
  },

  async updateAccount(id, data) {
    return await ApiService.put(`/accounts/${id}`, data);
  },

  async deactivateAccount(id) {
    return await ApiService.post(`/accounts/${id}/deactivate`);
  },

  async deleteAccount(id) {
    return await ApiService.delete(`/accounts/${id}`);
  }
};

export default accountService;
