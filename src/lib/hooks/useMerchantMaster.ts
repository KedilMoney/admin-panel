import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { merchantMasterApi, type MerchantMasterWritePayload } from '@/lib/api/merchantMaster';

export const merchantMasterQueryKey = ['merchant-master'] as const;

export const useMerchantMaster = () => {
  return useQuery({
    queryKey: merchantMasterQueryKey,
    queryFn: () => merchantMasterApi.get(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useUpdateMerchantMaster = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MerchantMasterWritePayload) => merchantMasterApi.put(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(merchantMasterQueryKey, data);
    },
  });
};
