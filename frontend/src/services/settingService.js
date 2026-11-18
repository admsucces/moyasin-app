import ApiService from './api';

export const settingService = {
  async getSettings() {
    return await ApiService.get('/settings');
  },

  async updateSettings(payload) {
    return await ApiService.put('/settings', payload);
  },
};

export default settingService;

