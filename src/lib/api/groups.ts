import { api } from './client';
import { Group } from '@/types';

export const groupsApi = {
  getAll: async (): Promise<Group[]> => {
    const response = await api.get<Group[]>('/api/groups');
    return response.data.data;
  },

  getById: async (id: string): Promise<Group> => {
    const response = await api.get<{ group: Group }>(`/api/groups/${id}`);
    return response.data.data.group;
  },

  create: async (data: FormData): Promise<{ group: Group }> => {
    const response = await api.post('/api/groups/create', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  update: async (id: string, data: FormData): Promise<{ group: Group }> => {
    const response = await api.put(`/api/groups/update/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  delete: async (id: string, toCategoryId?: string): Promise<void> => {
    await api.post(`/api/groups/delete/${id}`, { toCategoryId });
  },
};

