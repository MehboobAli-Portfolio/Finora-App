import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Dynamically determine the backend API URL from environment config
const getBaseUrl = () => {
  // Read from Expo app config (app.json extra) for environment-specific URLs
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  const configuredUrl = extra?.apiUrl;

  if (configuredUrl) {
    return configuredUrl.endsWith('/') ? configuredUrl : configuredUrl + '/';
  }

  // Development fallbacks (never use localhost in production builds)
  if (Platform.OS === 'web') return 'http://127.0.0.1:8000/api/';

  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    return `http://${hostUri.split(':')[0]}:8000/api/`;
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:8000/api/';

  // Safe default — requires explicit configuration for production
  return 'http://localhost:8000/api/';
};

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Token refresh queue to prevent race conditions ──
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      return Promise.reject(error);
    }

    if (error.response.status !== 401) {
      return Promise.reject(error);
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        const response = await axios.post(`${BASE_URL}auth/refresh/`, {
          refresh: refreshToken,
        });
        const { access, refresh } = response.data;
        await SecureStore.setItemAsync('access_token', access);
        if (refresh) {
          await SecureStore.setItemAsync('refresh_token', refresh);
        }

        processQueue(null, access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('auth/register/', data),
  login: (data) => api.post('auth/login/', data),
  getProfile: () => api.get('auth/profile/'),
  updateProfile: (data) => api.patch('auth/profile/', data),
  getDashboard: () => api.get('auth/dashboard/'),
  getDashboardInsight: () => api.get('ai/insight/'),
  chat: (data) => api.post('ai/chat/', data),
  passwordResetRequest: (data) => api.post('auth/password-reset/', data),
  passwordResetConfirm: (data) => api.post('auth/password-reset/confirm/', data),
  logout: (data) => api.post('auth/logout/', data),
};

// Expenses
export const expensesAPI = {
  list: (params) => api.get('transactions/', { params }),
  get: (id) => api.get(`transactions/${id}/`),
  create: (data) => api.post('transactions/', data),
  update: (id, data) => api.put(`transactions/${id}/`, data),
  delete: (id) => api.delete(`transactions/${id}/`),
  scanReceipt: (formData) => api.post('transactions/scan/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAnalytics: () => api.get('transactions/analytics/'),
};

// Goals
export const goalsAPI = {
  list: (params) => api.get('goals/', { params }),
  get: (id) => api.get(`goals/${id}/`),
  create: (data) => api.post('goals/', data),
  update: (id, data) => api.put(`goals/${id}/`, data),
  delete: (id) => api.delete(`goals/${id}/`),
};

// Investments
export const investmentsAPI = {
  list: (params) => api.get('investments/holdings/', { params }),
  get: (id) => api.get(`investments/holdings/${id}/`),
  create: (data) => api.post('investments/holdings/', data),
  update: (id, data) => api.patch(`investments/holdings/${id}/`, data),
  delete: (id) => api.delete(`investments/holdings/${id}/`),
  addUnits: (id, data) => api.post(`investments/holdings/${id}/add-units/`, data),
  assets: (params) => api.get('investments/assets/', { params }),
  priceHistory: (params) => api.get('investments/price-history/', { params }),
  getQuote: (symbol) => api.get(`investments/quote/?symbol=${symbol}`),
  getChartData: (symbol) => api.get(`investments/chart/?symbol=${symbol}`),
  refreshPrices: () => api.post('investments/refresh-prices/'),
  searchSymbol: (query) => api.get(`investments/search/?q=${query}`),
  getAnalytics: () => api.get('investments/analytics/'),
};

// AI Coach
export const aiAPI = {
  chat: (message, conversationId = null) => {
    const payload = { message };
    if (conversationId) payload.conversation_id = conversationId;
    return api.post('ai/chat/', payload);
  },

  /**
   * Stream a chat reply with a typewriter effect.
   *
   * React Native's fetch (Hermes) does NOT support ReadableStream / getReader(),
   * so true SSE streaming is not possible in Expo Go. Instead we:
   *   1. POST to the regular /ai/chat/ endpoint (fast JSON response)
   *   2. Simulate word-by-word streaming client-side so it still looks instant
   *
   * @param {string}      message        - The user's message
   * @param {string|null} conversationId - Existing conversation UUID or null
   * @param {function}    onToken        - Called per word: (token: string) => void
   * @param {function}    onDone         - Called when done: ({ intent, entities, conversation_id }) => void
   * @param {function}    onError        - Called on error: (msg: string) => void
   * @returns {function}                 - Abort function
   */
  chatStream: async (message, conversationId, onToken, onDone, onError) => {
    let cancelled = false;

    try {
      const payload = { message };
      if (conversationId) payload.conversation_id = conversationId;

      // Use the regular JSON endpoint — same response, just without real SSE
      const response = await api.post('ai/chat/', payload);
      const { reply, intent, entities, conversation_id } = response.data;

      if (cancelled) return;

      // Simulate typewriter — emit each word with a small delay
      const words = reply.split(' ');
      for (let i = 0; i < words.length; i++) {
        if (cancelled) return;
        const token = i < words.length - 1 ? words[i] + ' ' : words[i];
        onToken(token);
        // Small delay between words creates the streaming feel (8ms ≈ ~125 words/sec)
        await new Promise((resolve) => setTimeout(resolve, 8));
      }

      if (!cancelled) {
        onDone({ intent, entities, conversation_id });
      }
    } catch (err) {
      if (!cancelled) {
        const msg = err?.response?.data
          ? Object.values(err.response.data).flat().join(' ')
          : (err?.message ?? 'Connection error');
        onError(msg);
      }
    }

    // Return abort function
    return () => { cancelled = true; };
  },
  getHistory: () => api.get('ai/chat/history/'),
  getInsight: () => api.get('ai/insight/'),
};

// Salary Reality
export const salaryAPI = {
  analyse: (data) => api.post('salary/analyse/', data),
  getProfile: () => api.get('salary/profile/'),
  updateProfile: (data) => api.patch('salary/profile/', data),
};

export default api;
