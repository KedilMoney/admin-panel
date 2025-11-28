import { api } from './client';
import { BankMaster } from '@/types';

export const bankMasterApi = {
  getAll: async (): Promise<BankMaster[]> => {
    // Use admin endpoint to get all banks without user filtering
    const response = await api.get<{ banks: BankMaster[] }>('/api/bank-master/admin/all');
    return response.data.data.banks;
  },

  getById: async (id: number): Promise<BankMaster> => {
    const response = await api.get<{ bank: BankMaster }>(`/api/bank-master/${id}`);
    return response.data.data.bank;
  },

  create: async (data: FormData): Promise<BankMaster> => {
    const response = await api.post<{ bank: BankMaster }>('/api/bank-master/create', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.bank;
  },

  update: async (id: number, data: FormData): Promise<BankMaster> => {
    const response = await api.put<{ bank: BankMaster }>(`/api/bank-master/update/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.bank;
  },

  getAccountsCount: async (id: number): Promise<number> => {
    const response = await api.get<{ accountsCount: number }>(`/api/bank-master/${id}/accounts-count`);
    return response.data.data.accountsCount;
  },

  delete: async (id: number, migrateToBankId?: number): Promise<BankMaster> => {
    const params = migrateToBankId ? { params: { migrateToBankId } } : {};
    const response = await api.delete<{ bank: BankMaster }>(`/api/bank-master/delete/${id}`, params);
    return response.data.data.bank;
  },
};

