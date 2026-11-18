import ApiService from './api';

export const donorService = {
  async getDonors(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await ApiService.get(`/donors${query ? `?${query}` : ''}`);
  },

  async createDonor(data) {
    return await ApiService.post('/donors', data);
  },

  async updateDonor(id, data) {
    return await ApiService.put(`/donors/${id}`, data);
  },

  async deleteDonor(id) {
    return await ApiService.delete(`/donors/${id}`);
  }
};

export default donorService;
