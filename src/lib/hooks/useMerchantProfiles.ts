import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  merchantProfilesApi,
  type AddMerchantAliasPayload,
  type AddMerchantIdentifierPayload,
  type MergeMerchantProfilesPayload,
  type MerchantProfileBatchPayload,
  type MerchantProfilePayload,
  type SplitMerchantPayload,
} from '@/lib/api/merchantProfiles';
import type { MerchantAliasCleanupCorrection } from '@/types';

export const merchantProfilesQueryKey = ['merchant-profiles'] as const;

export const useMerchantProfiles = (search?: string) => {
  return useQuery({
    queryKey: [...merchantProfilesQueryKey, search],
    queryFn: () => merchantProfilesApi.getAll(search),
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
};

export const useCreateMerchantProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MerchantProfilePayload) => merchantProfilesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
    },
  });
};

export const useUpdateMerchantProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MerchantProfilePayload }) =>
      merchantProfilesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
    },
  });
};

export const useSaveMerchantProfileBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MerchantProfileBatchPayload }) =>
      merchantProfilesApi.saveBatch(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
    },
  });
};

export const useMerchantProfileDetail = (id: string | null, enabled: boolean) => {
  return useQuery({
    queryKey: [...merchantProfilesQueryKey, 'detail', id],
    queryFn: () => merchantProfilesApi.getDetail(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 60_000,
  });
};

export const useAddMerchantAlias = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      payload,
    }: {
      profileId: string;
      payload: AddMerchantAliasPayload;
    }) => merchantProfilesApi.addAlias(profileId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
    },
  });
};

export const useRemoveMerchantAlias = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, aliasId }: { profileId: string; aliasId: string }) =>
      merchantProfilesApi.removeAlias(profileId, aliasId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
    },
  });
};

export const useRunMerchantMergeJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => merchantProfilesApi.runMergeJob(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
    },
  });
};

export const useRunMerchantAliasCleanup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      apply,
      skipAliasIds,
      corrections,
    }: {
      apply: boolean;
      skipAliasIds?: string[];
      corrections?: MerchantAliasCleanupCorrection[];
    }) => merchantProfilesApi.runAliasCleanup(apply, { skipAliasIds, corrections }),
    onSuccess: (_data, variables) => {
      if (variables.apply) {
        queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
      }
    },
  });
};

export const useAddMerchantIdentifier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      payload,
    }: {
      profileId: string;
      payload: AddMerchantIdentifierPayload;
    }) => merchantProfilesApi.addIdentifier(profileId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
    },
  });
};

export const useRemoveMerchantIdentifier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      identifierId,
    }: {
      profileId: string;
      identifierId: string;
    }) => merchantProfilesApi.removeIdentifier(profileId, identifierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
    },
  });
};

export const useMergeMerchantProfiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MergeMerchantProfilesPayload) =>
      merchantProfilesApi.mergeProfiles(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
    },
  });
};

export const useSplitMerchantAlias = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      payload,
    }: {
      profileId: string;
      payload: SplitMerchantPayload;
    }) => merchantProfilesApi.splitAlias(profileId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
    },
  });
};

export const useSplitMerchantIdentifier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      payload,
    }: {
      profileId: string;
      payload: SplitMerchantPayload;
    }) => merchantProfilesApi.splitIdentifier(profileId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantProfilesQueryKey });
    },
  });
};
