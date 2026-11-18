import ApiService from './api';

export const programService = {
  async getPrograms(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await ApiService.get(`/programs${query ? `?${query}` : ''}`);
  },

  async createProgram(data) {
    return await ApiService.post('/programs', data);
  },

  async updateProgram(id, data) {
    return await ApiService.put(`/programs/${id}`, data);
  },

  async deactivateProgram(id) {
    return await ApiService.post(`/programs/${id}/deactivate`);
  },

  async deleteProgram(id) {
    return await ApiService.delete(`/programs/${id}`);
  }
};

export default programService;
