import { api } from './client';
import { Icon } from '@/types';

export const iconsApi = {
  getAll: async (search?: string): Promise<Icon[]> => {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    
    const response = await api.get<{ icons: Icon[] }>(
      `/api/icons${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data.data.icons || [];
  },

  getById: async (id: string): Promise<Icon> => {
    const response = await api.get<{ icon: Icon }>(`/api/icons/${id}`);
    return response.data.data.icon;
  },

  create: async (data: FormData): Promise<{ icon: Icon }> => {
    const response = await api.post('/api/icons/create', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  update: async (id: string, data: FormData): Promise<{ icon: Icon }> => {
    const response = await api.put(`/api/icons/update/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/icons/delete/${id}`);
  },
};

