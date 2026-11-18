import ApiService from './api';

export const journalService = {
  getJournals: async (params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return ApiService.get(`/journals${queryString}`);
  },

  getJournal: async (id) => {
    return ApiService.get(`/journals/${id}`);
  },

  createManualJournal: async (data) => {
    return ApiService.post('/journals', data);
  },

  postTransaction: async (transactionId) => {
    return ApiService.post(`/transactions/${transactionId}/post`, {});
  },
};

export default journalService;
