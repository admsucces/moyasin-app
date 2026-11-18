import ApiService from './api';

export const authService = {
  async login(email, password) {
    const res = await ApiService.post('/auth/login', { email, password });
    if (res.success && res.data?.token) {
      ApiService.setAuthToken(res.data.token);
    }
    return res;
  },

  async logout() {
    const res = await ApiService.post('/auth/logout');
    ApiService.setAuthToken(null);
    return res;
  },

  async getCurrentUser() {
    return await ApiService.get('/auth/me');
  }
};

export default authService;
