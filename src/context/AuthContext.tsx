'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface User {
  id: string;
  employee_no: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'SUPERVISOR' | 'MANAGER' | 'HR' | 'ADMIN';
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshTokens: () => Promise<boolean>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedUser && storedAccessToken) {
      try {
        setUser(JSON.parse(storedUser));
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
      } catch (err) {
        console.error('Failed to parse stored auth data:', err);
        localStorage.clear();
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Login failed');
      }

      const data = await response.json();
      const payload = data.data ?? data;

      const userData: User = {
        id: payload.user.id,
        employee_no: payload.user.employee_no,
        name: payload.user.name,
        email: payload.user.email,
        role: payload.user.role,
      };

      setUser(userData);
      setAccessToken(payload.access_token);
      setRefreshToken(payload.refresh_token);

      // Persist to localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', payload.access_token);
      localStorage.setItem('refreshToken', payload.refresh_token || '');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) {
      setError('No refresh token available');
      return false;
    }

    try {
      const response = await fetch('/api/v1/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const payload = data.data ?? data;

      setAccessToken(payload.access_token);
      setRefreshToken(payload.refresh_token);

      localStorage.setItem('accessToken', payload.access_token);
      localStorage.setItem('refreshToken', payload.refresh_token || '');

      return true;
    } catch (err) {
      console.error('Token refresh failed:', err);
      logout();
      return false;
    }
  }, [refreshToken]);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setError(null);
    localStorage.clear();
  }, []);

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    login,
    logout,
    refreshTokens,
    isAuthenticated: !!user && !!accessToken,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPERVISOR',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
