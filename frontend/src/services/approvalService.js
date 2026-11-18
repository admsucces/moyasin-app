import ApiService from './api';

export const approvalService = {
  getPendingApprovals: async (params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return ApiService.get(`/approvals/pending${queryString}`);
  },

  approveTransaction: async (id, comments = '') => {
    return ApiService.post(`/transactions/${id}/approve`, { comments });
  },

  rejectTransaction: async (id, reason) => {
    return ApiService.post(`/transactions/${id}/reject`, { reason });
  },
};

export default approvalService;
