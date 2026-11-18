import ApiService from './api';

export const exportService = {
  /**
   * Export Transactions to CSV
   */
  exportTransactions: async (params = {}) => {
    const searchParams = new URLSearchParams(params).toString();
    const query = searchParams ? `?${searchParams}` : '';
    const res = await ApiService.downloadBlob(`/export/transactions${query}`);
    if (res.success && res.blob) {
      const url = window.URL.createObjectURL(res.blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Transactions_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    }
  },

  /**
   * Export Journals to CSV
   */
  exportJournals: async (params = {}) => {
    const searchParams = new URLSearchParams(params).toString();
    const query = searchParams ? `?${searchParams}` : '';
    const res = await ApiService.downloadBlob(`/export/journals${query}`);
    if (res.success && res.blob) {
      const url = window.URL.createObjectURL(res.blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Jurnal_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    }
  },

  /**
   * Export Trial Balance to CSV
   */
  exportTrialBalance: async (params = {}) => {
    const searchParams = new URLSearchParams(params).toString();
    const query = searchParams ? `?${searchParams}` : '';
    const res = await ApiService.downloadBlob(`/export/reports/trial-balance${query}`);
    if (res.success && res.blob) {
      const url = window.URL.createObjectURL(res.blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Trial_Balance_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    }
  },
};

export default exportService;

