import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Create a separate axios instance for login (without auth interceptor)
const loginClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Include cookies for CORS
});

export const authApi = {
  login: async (email: string, password: string): Promise<{ success: boolean; token: string }> => {
    try {
      // Login to backend API to get JWT token
      const response = await loginClient.post('/api/users/login', {
        email,
        password,
      });
      
      // Extract token from response
      // Response structure: { success: true, message: "...", data: { accessToken: "...", refreshToken: "...", user: {...} }, status: 200 }
      const token = response.data?.data?.accessToken;
      
      if (!token) {
        throw new Error('No access token received from server');
      }
      
      // Store token in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', token);
        // Also store user info if available
        if (response.data?.data?.user) {
          localStorage.setItem('admin_user', JSON.stringify(response.data.data.user));
        }
      }
      
      return { success: true, token };
    } catch (error: any) {
      // Handle different error types
      if (error.response) {
        // Server responded with error
        const errorMessage = error.response.data?.message || 'Login failed';
        throw new Error(errorMessage);
      } else if (error.request) {
        // Request made but no response
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      } else {
        // Something else happened
        throw new Error(error.message || 'An unexpected error occurred');
      }
    }
  },

  logout: async (): Promise<void> => {
    try {
      // Try to logout from backend
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      if (token) {
        // Create a temporary client with the token for logout
        const logoutClient = axios.create({
          baseURL: API_BASE_URL,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          withCredentials: true,
        });
        
        await logoutClient.post('/api/users/logout').catch(() => {
          // Ignore logout errors - we'll clear local storage anyway
        });
      }
    } catch (error) {
      // Ignore errors during logout
    } finally {
      // Always clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
  },

  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('admin_token');
  },

  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_token');
  },

  getUser: (): any | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('admin_user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

