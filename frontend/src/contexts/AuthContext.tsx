import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import axiosRetry from 'axios-retry';

import { logger } from '../lib/logger';
import { setAccessToken as setGlobalAccessToken } from '../lib/api/apiClient';

const AuthContext = createContext();

// Create an Axios instance that will carry our auth token
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  onRetry: (retryCount, error, requestConfig) => {
    logger.warn(`Auth API Retry (${retryCount}/3): ${requestConfig.url}`);
  },
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial load: Try to get me
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // If we don't have an access token in memory, try to refresh it
      const { data } = await api.post('/auth/refresh');
      setSession(data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const setSession = ({ accessToken, user }) => {
    setUser(user);
    setGlobalAccessToken(accessToken);
    // Add interceptor to inject access token
    api.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    });
  };

  const login = async (username, password, googleAccessToken) => {
    const { data } = await api.post('/auth/login', { username, password, googleAccessToken });
    setSession(data);
    return data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        data: user ? { user } : null,
        status: loading ? 'loading' : user ? 'authenticated' : 'unauthenticated',
        signIn: login,
        signOut: logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Drop-in replacement hook for next-auth's useSession
export const useSession = () => useContext(AuthContext);
