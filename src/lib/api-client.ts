import axios, { AxiosInstance, AxiosError } from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  message: string;
  data?: T;
  error?: {
    code: string;
    message?: string;
  };
  timestamp: string;
}

class ApiClient {
  private instance: AxiosInstance;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add token to headers
    this.instance.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor - handle token refresh
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Prevent multiple simultaneous refresh calls
            if (!this.refreshPromise) {
              this.refreshPromise = this.refreshAccessToken();
            }

            const success = await this.refreshPromise;
            this.refreshPromise = null;

            if (success) {
              const newToken = localStorage.getItem('accessToken');
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.instance(originalRequest);
            } else {
              // Refresh failed, redirect to login
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }
          } catch (refreshError) {
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (!refreshToken) {
        return false;
      }

      const response = await axios.patch<ApiResponse>('/api/v1/auth', {
        refresh_token: refreshToken,
      });

      if (response.data.success) {
        const payload = response.data.data || response.data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', (payload as any).access_token);
          localStorage.setItem('refreshToken', (payload as any).refresh_token || '');
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  async get<T = any>(url: string, config?: any) {
    const response = await this.instance.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: any) {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: any) {
    const response = await this.instance.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: any) {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: any) {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
