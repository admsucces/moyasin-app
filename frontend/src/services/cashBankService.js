import ApiService from './api';

export const cashBankService = {
  async getCashBankAccounts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await ApiService.get(`/cash-bank-accounts${query ? `?${query}` : ''}`);
  },

  async createCashBankAccount(data) {
    return await ApiService.post('/cash-bank-accounts', data);
  },

  async updateCashBankAccount(id, data) {
    return await ApiService.put(`/cash-bank-accounts/${id}`, data);
  },

  async deleteCashBankAccount(id) {
    return await ApiService.delete(`/cash-bank-accounts/${id}`);
  }
};

export default cashBankService;
