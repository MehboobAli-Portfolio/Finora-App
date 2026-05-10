import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const userData = await SecureStore.getItemAsync('user_data');
      const token = await SecureStore.getItemAsync('access_token');
      if (userData && token) {
        setUser(JSON.parse(userData));
        // Verify token by refreshing profile in the background
        refreshUser();
      }
    } catch (error) {
      console.error('Auth state error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { access, refresh } = response.data;
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
    // Get profile
    const profileRes = await authAPI.getProfile();
    await SecureStore.setItemAsync('user_data', JSON.stringify(profileRes.data));
    setUser(profileRes.data);
    return profileRes.data;
  };

  const register = async (email, username, fullName, password, password2) => {
    const response = await authAPI.register({ email, username, full_name: fullName, password, password2 });
    const { tokens, user: userData } = response.data;
    await SecureStore.setItemAsync('access_token', tokens.access);
    await SecureStore.setItemAsync('refresh_token', tokens.refresh);
    await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_data');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getProfile();
      await SecureStore.setItemAsync('user_data', JSON.stringify(res.data));
      setUser(res.data);
    } catch (e) {
      console.error('Refresh user failed:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
