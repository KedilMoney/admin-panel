import { api } from './client';

export type RewardRedemptionMode =
  | 'FLIGHT'
  | 'HOTEL'
  | 'DINING'
  | 'GIFT_VOUCHER'
  | 'CASHBACK'
  | 'MERCHANDISE';

export interface RewardValueRate {
  id: string;
  bankName: string;
  cardName: string | null;
  mode: RewardRedemptionMode;
  valuePerPoint: string | number;
  minPoints: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  source: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RewardValueRateFilters {
  bankName?: string;
  mode?: RewardRedemptionMode;
}

export interface RewardValueRateInput {
  bankName: string;
  cardName?: string | null;
  mode: RewardRedemptionMode;
  valuePerPoint: number;
  minPoints?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive?: boolean;
  source?: string | null;
}

export const REWARD_REDEMPTION_MODES: RewardRedemptionMode[] = [
  'FLIGHT',
  'HOTEL',
  'DINING',
  'GIFT_VOUCHER',
  'CASHBACK',
  'MERCHANDISE',
];

export const REWARD_MODE_LABELS: Record<RewardRedemptionMode, string> = {
  FLIGHT: 'Flight',
  HOTEL: 'Hotel',
  DINING: 'Dining',
  GIFT_VOUCHER: 'Gift voucher',
  CASHBACK: 'Cashback',
  MERCHANDISE: 'Merchandise',
};

export const rewardValueRatesApi = {
  list: async (filters: RewardValueRateFilters = {}): Promise<RewardValueRate[]> => {
    const params = new URLSearchParams();
    if (filters.bankName?.trim()) params.set('bankName', filters.bankName.trim());
    if (filters.mode) params.set('mode', filters.mode);
    const query = params.toString();
    const response = await api.get<RewardValueRate[]>(
      `/api/admin/reward-value-rates${query ? `?${query}` : ''}`
    );
    return response.data.data;
  },

  create: async (input: RewardValueRateInput): Promise<RewardValueRate> => {
    const response = await api.post<RewardValueRate>('/api/admin/reward-value-rates', input);
    return response.data.data;
  },

  update: async (id: string, input: Partial<RewardValueRateInput>): Promise<RewardValueRate> => {
    const response = await api.put<RewardValueRate>(`/api/admin/reward-value-rates/${id}`, input);
    return response.data.data;
  },

  delete: async (id: string): Promise<RewardValueRate> => {
    const response = await api.delete<RewardValueRate>(`/api/admin/reward-value-rates/${id}`);
    return response.data.data;
  },
};
