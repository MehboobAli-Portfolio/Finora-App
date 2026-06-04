import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Dynamically determine the backend API URL
const getBaseUrl = () => {
  // If running on web or connecting via localhost directly
  if (Platform.OS === 'web') return 'http://127.0.0.1:8000/api/';
  
  // Try to use the Expo packager IP automatically dynamically
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  
  if (hostUri) {
    return `http://${hostUri.split(':')[0]}:8000/api/`;
  }
  
  // Fallback for Android Emulator
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000/api/';
  
  // Default fallback (could be changed to production URL later)
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
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
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

    // Only log non-401 errors as errors; 401 is a normal token-expiry flow
    if (error.response?.status !== 401) {
      console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} -> ${error.response?.status}`);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue this request
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
        const { access } = response.data;
        await SecureStore.setItemAsync('access_token', access);

        // Process queued requests with new token
        processQueue(null, access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // user_data can stay in AsyncStorage as it's not sensitive, but for consistency we can move it or leave it.
        // AsyncStorage.removeItem('user_data') is still needed if we don't move it.
        // Let's keep user_data in SecureStore for consistency.
        await SecureStore.deleteItemAsync('user_data');
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
