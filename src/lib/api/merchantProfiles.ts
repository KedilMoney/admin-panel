import { api } from './client';
import type { MerchantProfile, SystemCategoryOption } from '@/types';

export interface MerchantProfilesResponse {
  merchants: MerchantProfile[];
  systemCategories: SystemCategoryOption[];
}

export interface MerchantProfilePayload {
  canonicalName: string;
  systemCategoryId: string;
  upiId?: string | null;
  accountNumber?: string | null;
  confidence?: number;
}

export const merchantProfilesApi = {
  getAll: async (search?: string): Promise<MerchantProfilesResponse> => {
    const queryParams = new URLSearchParams();
    if (search?.trim()) {
      queryParams.append('search', search.trim());
    }

    const response = await api.get<MerchantProfilesResponse>(
      `/api/admin/merchant-profiles${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );

    return response.data.data;
  },

  create: async (payload: MerchantProfilePayload): Promise<MerchantProfile> => {
    const response = await api.post<MerchantProfile>('/api/admin/merchant-profiles', payload);
    return response.data.data;
  },

  update: async (id: string, payload: MerchantProfilePayload): Promise<MerchantProfile> => {
    const response = await api.put<MerchantProfile>(`/api/admin/merchant-profiles/${id}`, payload);
    return response.data.data;
  },
};
