import ApiService from './api';

export const debtPaymentService = {
  updatePayment: async (id, data) => {
    return ApiService.put(`/debt-payments/${id}`, data);
  },

  deletePayment: async (id) => {
    return ApiService.delete(`/debt-payments/${id}`);
  },
};

export default debtPaymentService;
