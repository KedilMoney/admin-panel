import { api } from './client';
import type { MerchantMasterData } from '@/types';

export const merchantMasterApi = {
  get: async (): Promise<MerchantMasterData> => {
    const response = await api.get<MerchantMasterData>('/api/admin/merchant-master');
    return response.data.data;
  },
};
