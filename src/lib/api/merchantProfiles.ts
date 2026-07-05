import { api } from './client';
import type {
  MerchantAliasCleanupCorrection,
  MerchantAliasCleanupResult,
  MerchantMergeJobResult,
  MerchantProfile,
  SystemCategoryOption,
} from '@/types';

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

export interface MerchantProfileBatchPayload extends MerchantProfilePayload {
  verificationLevel: string;
  type: string;
  tags: string[];
  identifiers: { id?: string; type: 'UPI' | 'NEFT' | 'ACCOUNT'; value: string }[];
  aliases: { id?: string; rawName: string; bankSource?: string | null }[];
  removedIdentifierIds: string[];
  removedAliasIds: string[];
}

export interface UserMerchantMappingDto {
  merchantKey: string;
  category: string;
  userCorrected: boolean;
  confirmed: boolean;
  firstSeen: string;
  lastSeen: string;
}

export interface MerchantProfileDetailResponse {
  userMappings: UserMerchantMappingDto[];
}

export interface AddMerchantAliasPayload {
  rawName: string;
  bankSource?: string | null;
}

export interface AddMerchantIdentifierPayload {
  type: 'UPI' | 'NEFT' | 'ACCOUNT';
  value: string;
}

export interface MergeMerchantProfilesPayload {
  survivorId: string;
  duplicateIds: string[];
  systemCategoryId?: string | null;
}

export interface SplitMerchantPayload {
  aliasId?: string;
  identifierId?: string;
  canonicalName: string;
  systemCategoryId: string;
}

export interface MergeMerchantProfilesResult {
  survivorId: string;
  duplicateId: string | null;
  duplicateIds: string[];
  mergedCount: number;
  profile: MerchantProfile;
}

export interface SplitMerchantResult {
  sourceProfileId: string;
  newProfile: MerchantProfile;
}

export interface RemoveMerchantIdentifierResult {
  deleted: boolean;
  wasLastIdentifier: boolean;
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

  saveBatch: async (id: string, payload: MerchantProfileBatchPayload): Promise<MerchantProfile> => {
    const response = await api.put<MerchantProfile>(`/api/admin/merchant-profiles/${id}`, payload);
    return response.data.data;
  },

  getDetail: async (id: string): Promise<MerchantProfileDetailResponse> => {
    const response = await api.get<MerchantProfileDetailResponse>(
      `/api/admin/merchant-profiles/${id}/detail`
    );
    return response.data.data;
  },

  addAlias: async (
    profileId: string,
    payload: AddMerchantAliasPayload
  ): Promise<{ profileId: string; rawName: string }> => {
    const response = await api.post<{ profileId: string; rawName: string }>(
      `/api/admin/merchant-profiles/${profileId}/aliases`,
      payload
    );
    return response.data.data;
  },

  removeAlias: async (profileId: string, aliasId: string): Promise<{ deleted: boolean }> => {
    const response = await api.delete<{ deleted: boolean }>(
      `/api/admin/merchant-profiles/${profileId}/aliases/${aliasId}`
    );
    return response.data.data;
  },

  runMergeJob: async (): Promise<MerchantMergeJobResult> => {
    const response = await api.post<MerchantMergeJobResult>(
      '/api/admin/merchant-profiles/merge-job'
    );
    return response.data.data;
  },

  runAliasCleanup: async (
    apply: boolean,
    options: {
      skipAliasIds?: string[];
      corrections?: MerchantAliasCleanupCorrection[];
    } = {}
  ): Promise<MerchantAliasCleanupResult> => {
    const response = await api.post<MerchantAliasCleanupResult>(
      '/api/admin/merchant-profiles/alias-cleanup',
      {
        apply,
        skipAliasIds: options.skipAliasIds ?? [],
        corrections: options.corrections ?? [],
      },
      apply ? { timeout: 120_000 } : undefined
    );
    return response.data.data;
  },

  addIdentifier: async (
    profileId: string,
    payload: AddMerchantIdentifierPayload
  ) => {
    const response = await api.post(
      `/api/admin/merchant-profiles/${profileId}/identifiers`,
      payload
    );
    return response.data.data;
  },

  removeIdentifier: async (profileId: string, identifierId: string) => {
    const response = await api.delete<RemoveMerchantIdentifierResult>(
      `/api/admin/merchant-profiles/${profileId}/identifiers/${identifierId}`
    );
    return response.data.data;
  },

  mergeProfiles: async (payload: MergeMerchantProfilesPayload) => {
    const response = await api.post<MergeMerchantProfilesResult>(
      '/api/admin/merchant-profiles/merge',
      payload
    );
    return response.data.data;
  },

  splitAlias: async (profileId: string, payload: SplitMerchantPayload) => {
    const response = await api.post<SplitMerchantResult>(
      `/api/admin/merchant-profiles/${profileId}/split-alias`,
      payload
    );
    return response.data.data;
  },

  splitIdentifier: async (profileId: string, payload: SplitMerchantPayload) => {
    const response = await api.post<SplitMerchantResult>(
      `/api/admin/merchant-profiles/${profileId}/split-identifier`,
      payload
    );
    return response.data.data;
  },
};
