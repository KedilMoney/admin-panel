import { api } from './client';
import type { MerchantMasterData } from '@/types';

export type MerchantMasterWritePayload = Pick<
  MerchantMasterData,
  'upiSubstrings' | 'namePatterns'
>;

/**
 * Merchant master rules (UPI substrings + name regexes) for Phase A auto-categorization.
 * High-confidence LLM categorization on the API server can merge new rows into the same
 * persisted document this client reads via `get` / edits via `put` (see `meta.serverAutoTrainingEnabled`).
 */
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
