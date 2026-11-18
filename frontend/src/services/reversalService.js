import ApiService from './api';

export const reversalService = {
  reverseTransaction: async (id, reason) => {
    return ApiService.post(`/transactions/${id}/reverse`, { reason });
  },
};

export default reversalService;
