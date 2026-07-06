import { api } from './client';

export interface Payee {
  id: string;
  name: string;
  iconSlug?: string;
  details?: any;
  createdAt?: string;
  updatedAt?: string;
}

export const payeesApi = {
  getAll: async (
    search?: string,
    page?: number,
    limit?: number,
    excludeAccountPayees = true
  ): Promise<{ payees: Payee[]; pagination: any }> => {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());
    if (excludeAccountPayees) queryParams.append('excludeAccountPayees', 'true');

    const response = await api.get<{ payees: Payee[]; pagination: any }>(
      `/api/payees${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return {
      payees: response.data.data.payees || [],
      pagination: response.data.data.pagination || {},
    };
  },

  getById: async (id: string): Promise<Payee> => {
    const response = await api.get<{ payee: Payee }>(`/api/payees/${id}`);
    return response.data.data.payee;
  },

  create: async (data: { name: string; iconSlug?: string; details?: any }): Promise<{ payee: Payee }> => {
    const response = await api.post('/api/payees/create', data);
    return response.data.data;
  },

  update: async (id: string, data: { name: string; iconSlug?: string; details?: any }): Promise<{ payee: Payee }> => {
    const response = await api.put(`/api/payees/update/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/payees/delete/${id}`);
  },
};
