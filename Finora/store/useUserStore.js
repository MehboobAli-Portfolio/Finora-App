import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  USER: 'finora_user',
  TOKEN: 'finora_access_token',
  REFRESH: 'finora_refresh_token',
  AUTH: 'finora_is_authenticated',
};

export const useUserStore = create((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,

  login: async (userData, token, refreshToken) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(userData));
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, token);
    if (refreshToken) {
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH, refreshToken);
    }
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH, 'true');
    set({ user: userData, token, refreshToken, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH);
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },

  updateUser: (userData) => set((state) => ({
    user: { ...state.user, ...userData },
  })),

  loadStoredAuth: async () => {
    try {
      const [userStr, token, auth] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.USER),
        SecureStore.getItemAsync(STORAGE_KEYS.TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.AUTH),
      ]);
      if (userStr && token && auth === 'true') {
        set({
          user: JSON.parse(userStr),
          token,
          isAuthenticated: true,
        });
      }
    } catch (e) {
      console.error('Failed to load stored auth:', e);
    }
  },

  clearStoredAuth: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH);
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },
}));
