import ApiService from './api';

const buildQueryString = (params) => {
  if (!params) return '';
  if (typeof params === 'string') return params ? `?as_of_date=${params}` : '';
  if (typeof params === 'object' && params !== null) {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        searchParams.append(key, params[key]);
      }
    });
    return searchParams.toString() ? `?${searchParams.toString()}` : '';
  }
  return '';
};

export const reportService = {
  /**
   * GET /api/v1/reports/balance-sheet
   */
  getBalanceSheet: async (params = {}) => {
    const queryString = buildQueryString(params);
    return ApiService.get(`/reports/balance-sheet${queryString}`);
  },

  /**
   * GET /api/v1/reports/income-statement
   */
  getIncomeStatement: async (params, endDate) => {
    let queryString = '';
    if (typeof params === 'object' && params !== null) {
      queryString = buildQueryString(params);
    } else if (params || endDate) {
      const searchParams = new URLSearchParams();
      if (params) searchParams.append('start_date', params);
      if (endDate) searchParams.append('end_date', endDate);
      queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    }
    return ApiService.get(`/reports/income-statement${queryString}`);
  },

  /**
   * GET /api/v1/reports/changes-in-net-assets
   */
  getChangesInNetAssets: async (startDate, endDate) => {
    let queryString = '';
    if (typeof startDate === 'object' && startDate !== null) {
      queryString = buildQueryString(startDate);
    } else {
      const searchParams = new URLSearchParams();
      if (startDate) searchParams.append('start_date', startDate);
      if (endDate) searchParams.append('end_date', endDate);
      queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    }
    return ApiService.get(`/reports/changes-in-net-assets${queryString}`);
  },

  /**
   * GET /api/v1/reports/cash-flows
   */
  getCashFlows: async (startDate, endDate) => {
    let queryString = '';
    if (typeof startDate === 'object' && startDate !== null) {
      queryString = buildQueryString(startDate);
    } else {
      const searchParams = new URLSearchParams();
      if (startDate) searchParams.append('start_date', startDate);
      if (endDate) searchParams.append('end_date', endDate);
      queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    }
    return ApiService.get(`/reports/cash-flows${queryString}`);
  },

  /**
   * GET /api/v1/reports/management
   */
  getManagementSummary: async (startDate, endDate) => {
    let queryString = '';
    if (typeof startDate === 'object' && startDate !== null) {
      queryString = buildQueryString(startDate);
    } else {
      const searchParams = new URLSearchParams();
      if (startDate) searchParams.append('start_date', startDate);
      if (endDate) searchParams.append('end_date', endDate);
      queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    }
    return ApiService.get(`/reports/management${queryString}`);
  },

  /**
   * GET /api/v1/reports/post-closing-trial-balance
   */
  getPostClosingTrialBalance: async (params = {}) => {
    const queryString = buildQueryString(params);
    return ApiService.get(`/reports/post-closing-trial-balance${queryString}`);
  },
};

export default reportService;
