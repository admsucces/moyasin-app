import ApiService from './api';

export const auditLogService = {
  /**
   * GET /api/v1/audit-logs
   */
  getAuditLogs: async (params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return ApiService.get(`/audit-logs${queryString}`);
  },
};

export default auditLogService;
