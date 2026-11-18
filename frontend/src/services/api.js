// API Service with standard envelope handling & security headers
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiService {
  static getAuthToken() {
    return localStorage.getItem('auth_token');
  }

  static setAuthToken(token) {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  static async request(endpoint, options = {}) {
    const token = this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      const data = await response.json().catch(() => ({
        success: false,
        message: 'Gagal memproses respon dari server.',
      }));

      if (!response.ok) {
        if (response.status === 401) {
          this.setAuthToken(null);
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        
        return {
          success: false,
          status: response.status,
          message: data.message || 'Terjadi kesalahan pada server.',
          errors: data.errors || null,
          error: data.error || null,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        status: 500,
        message: 'Koneksi ke server terputus. Silakan periksa koneksi internet Anda.',
      };
    }
  }

  static get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  static post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  static async upload(endpoint, formData) {
    const token = this.getAuthToken();
    const headers = {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => ({
        success: false,
        message: 'Gagal memproses respon dari server.',
      }));

      if (!response.ok) {
        if (response.status === 401) {
          this.setAuthToken(null);
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        
        return {
          success: false,
          status: response.status,
          message: data.message || 'Terjadi kesalahan pada server.',
          errors: data.errors || null,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        status: 500,
        message: 'Koneksi ke server terputus. Silakan periksa koneksi internet Anda.',
      };
    }
  }

  static delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  static async downloadBlob(endpoint) {
    const token = this.getAuthToken();
    const headers = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.setAuthToken(null);
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        return { success: false, message: 'Gagal mengunduh berkas.' };
      }

      const blob = await response.blob();
      return { success: true, blob };
    } catch (error) {
      return { success: false, message: 'Koneksi ke server terputus.' };
    }
  }
}


export default ApiService;
