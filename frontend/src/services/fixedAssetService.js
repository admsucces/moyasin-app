import ApiService from './api';

export const fixedAssetService = {
  getFixedAssets: async (params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return ApiService.get(`/fixed-assets${queryString}`);
  },

  getFixedAsset: async (id) => {
    return ApiService.get(`/fixed-assets/${id}`);
  },

  createFixedAsset: async (data) => {
    return ApiService.post('/fixed-assets', data);
  },

  updateFixedAsset: async (id, data) => {
    return ApiService.put(`/fixed-assets/${id}`, data);
  },

  deleteFixedAsset: async (id) => {
    return ApiService.delete(`/fixed-assets/${id}`);
  },

  processMonthlyDepreciation: async (data) => {
    return ApiService.post('/fixed-assets/depreciate', data);
  }
};

export default fixedAssetService;
