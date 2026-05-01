import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  
  // Fallback
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000/api/';
  
  return 'http://192.168.18.15:8000/api/';
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
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.baseURL}${error.config?.url} -> ${error.response?.status}`);
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        const response = await axios.post(`${BASE_URL}auth/refresh/`, {
          refresh: refreshToken,
        });
        const { access } = response.data;
        await AsyncStorage.setItem('access_token', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
        return Promise.reject(refreshError);
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
  create: (data) => api.post('investments/holdings/', data),
  update: (id, data) => api.put(`investments/holdings/${id}/`, data),
  delete: (id) => api.delete(`investments/holdings/${id}/`),
  assets: (params) => api.get('investments/assets/', { params }),
  priceHistory: (params) => api.get('investments/price-history/', { params }),
  getQuote: (symbol) => api.get(`investments/quote/?symbol=${symbol}`),
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
