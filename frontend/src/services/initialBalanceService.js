import ApiService from './api';

export const initialBalanceService = {
  getInitialBalances: async () => {
    return ApiService.get('/initial-balances');
  },

  saveInitialBalances: async (data) => {
    return ApiService.post('/initial-balances', data);
  }
};

export default initialBalanceService;
