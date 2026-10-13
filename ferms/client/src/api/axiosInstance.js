// api/axiosInstance.js — Configured Axios instance with base URL, JWT header, and error handling
import axios from 'axios';

export class ApiError extends Error {
  constructor(status, code, message, allowedNext) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.message = message;
    this.allowedNext = allowedNext;
  }
}

const axiosInstance = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || '/api',
});

// Request interceptor: injects JWT Bearer token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ferms_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: formats error into ApiError envelope and handles 401
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const errorPayload = data?.error || {};
      const code = errorPayload.code || 'UNKNOWN_ERROR';
      const message = errorPayload.message || error.message || 'Request failed';
      const allowedNext = errorPayload.allowedNext;

      const requestUrl = error.config?.url || '';
      const isLogin = requestUrl.includes('/auth/login');

      if (status === 401 && !isLogin) {
        localStorage.removeItem('ferms_token');
        localStorage.removeItem('ferms_user');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      return Promise.reject(new ApiError(status, code, message, allowedNext));
    }

    // Fall back to network error when there is no response
    return Promise.reject(
      new ApiError(
        0,
        'NETWORK_ERROR',
        error.message || 'Network error',
        undefined
      )
    );
  }
);

export default axiosInstance;
