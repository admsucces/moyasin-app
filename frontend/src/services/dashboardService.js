import ApiService from './api';

export const dashboardService = {
  async getDashboardData(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await ApiService.get(`/dashboard${query ? `?${query}` : ''}`);
  }
};

export default dashboardService;

