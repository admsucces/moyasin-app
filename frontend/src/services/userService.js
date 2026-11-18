import ApiService from './api';

export const userService = {
  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/users${query ? `?${query}` : ''}`;
    return await ApiService.get(endpoint);
  },

  async createUser(userData) {
    return await ApiService.post('/users', userData);
  },

  async updateUser(id, userData) {
    return await ApiService.put(`/users/${id}`, userData);
  },

  async toggleUserStatus(id, status) {
    return await ApiService.post(`/users/${id}/status`, { status });
  }
};

export default userService;
