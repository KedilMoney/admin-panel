import { api } from './client';
import type { MerchantMasterData } from '@/types';

export type MerchantMasterWritePayload = Pick<
  MerchantMasterData,
  'upiSubstrings' | 'namePatterns'
>;

export const merchantMasterApi = {
  get: async (): Promise<MerchantMasterData> => {
    const response = await api.get<MerchantMasterData>('/api/admin/merchant-master');
    return response.data.data;
  },

  put: async (payload: MerchantMasterWritePayload): Promise<MerchantMasterData> => {
    const response = await api.put<MerchantMasterData>(
      '/api/admin/merchant-master',
      payload
    );
    return response.data.data;
  },
};
