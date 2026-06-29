import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  merchantProfilesApi,
  type AddMerchantAliasPayload,
  type MerchantProfilePayload,
} from '@/lib/api/merchantProfiles';

export const merchantProfilesQueryKey = ['merchant-profiles'] as const;

export const useMerchantProfiles = (search?: string) => {
  return useQuery({
    queryKey: [...merchantProfilesQueryKey, search],
    queryFn: () => merchantProfilesApi.getAll(search),
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
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
