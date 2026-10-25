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
   * Stream a chat reply using Server-Sent Events.
   *
   * @param {string}   message         - The user's message text
   * @param {string|null} conversationId - Existing conversation UUID (or null for new)
   * @param {function} onToken         - Called with each streamed word token: (token: string) => void
   * @param {function} onDone          - Called when stream ends: ({ intent, entities, conversation_id }) => void
   * @param {function} onError         - Called on network/parse error: (errorMsg: string) => void
   * @returns {function}               - Abort function — call it to cancel the stream
   */
  chatStream: async (message, conversationId, onToken, onDone, onError) => {
    // Read JWT access token from secure storage
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) {
      onError('Not authenticated');
      return () => {};
    }

    const url = `${BASE_URL}ai/chat/stream/`;
    const body = JSON.stringify(
      conversationId ? { message, conversation_id: conversationId } : { message }
    );

    const controller = new AbortController();

    // Use fetch() — axios does not support streaming on React Native
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          onError(`Server error: ${response.status}`);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE events are separated by double newline
          const parts = buffer.split('\n\n');
          // The last part may be incomplete — keep it in the buffer
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.slice(5).trim();
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'token') {
                onToken(event.token);
              } else if (event.type === 'done') {
                onDone({
                  intent:          event.intent,
                  entities:        event.entities,
                  conversation_id: event.conversation_id,
                });
              } else if (event.type === 'error') {
                onError(event.message ?? 'Stream error');
              }
            } catch {
              // Malformed JSON in one event — skip it, don't break the stream
            }
          }
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // User cancelled — ignore
        onError(err.message ?? 'Connection error');
      });

    // Return abort function so the caller can cancel (e.g. on unmount)
    return () => controller.abort();
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
