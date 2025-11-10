import { api } from './client';
import { User } from '@/types';

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/api/users');
    return response.data.data;
  },

  getByEmail: async (email: string): Promise<User> => {
    const response = await api.post<User>('/api/users/email', { email });
    return response.data.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/api/users/${id}`);
    return response.data.data;
  },
};

