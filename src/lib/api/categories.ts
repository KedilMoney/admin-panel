import { api } from './client';
import { Category, CategoryGroup, DashboardData } from '@/types';

export const categoriesApi = {
  getAll: async (params?: { startDate?: string; endDate?: string; epoch?: number }): Promise<{
    groups: CategoryGroup[];
    uncategorized: { amount: number; activity: any[] };
    summary: any;
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.epoch) queryParams.append('epoch', params.epoch.toString());
    
    const response = await api.get(`/api/categories?${queryParams.toString()}`);
    return response.data.data;
  },

  getById: async (id: string, params?: { epoch?: number }): Promise<Category> => {
    const queryParams = new URLSearchParams();
    if (params?.epoch) queryParams.append('epoch', params.epoch.toString());
    
    const response = await api.get<{ category: Category }>(`/api/categories/${id}?${queryParams.toString()}`);
    return response.data.data.category;
  },

  create: async (data: FormData): Promise<{ category: { id: string }; group: { id: string } }> => {
    const response = await api.post('/api/categories/create', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  update: async (id: string, data: FormData): Promise<{ category: { id: string; name: string } }> => {
    const response = await api.put(`/api/categories/update/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  delete: async (id: string, toCategoryId?: string): Promise<void> => {
    await api.post(`/api/categories/delete/${id}`, { toCategoryId });
  },

  dashboard: async (data: { fromDate: string; toDate: string; search?: string; groupId?: string }): Promise<DashboardData> => {
    const response = await api.post<DashboardData>('/api/categories/dashboard', data);
    return response.data.data;
  },

  search: async (data: { page: number; size: number; fromDate: string; toDate: string; search?: string; groupId?: string }): Promise<{
    groups: CategoryGroup[];
    uncategorized: { amount: number; activity: any[] };
    summary: any;
    pagination: any;
  }> => {
    const response = await api.post('/api/categories/search', data);
    return response.data.data;
  },
};

