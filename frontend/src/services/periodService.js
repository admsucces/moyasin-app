import ApiService from './api';

export const periodService = {
  getPeriods: async () => {
    return ApiService.get('/accounting-periods');
  },

  createPeriod: async (data) => {
    return ApiService.post('/accounting-periods', data);
  },

  closePeriod: async (id) => {
    return ApiService.post(`/accounting-periods/${id}/close`, {});
  },

  requestReopen: async (id, reason) => {
    return ApiService.post(`/accounting-periods/${id}/reopen-request`, { reason });
  },

  approveReopen: async (id, reason = null) => {
    return ApiService.post(`/accounting-periods/${id}/reopen`, { reason });
  },
};

export default periodService;
