import { useQuery } from '@tanstack/react-query';
import { merchantMasterApi } from '@/lib/api/merchantMaster';

export const merchantMasterQueryKey = ['merchant-master'] as const;

export const useMerchantMaster = () => {
  return useQuery({
    queryKey: merchantMasterQueryKey,
    queryFn: () => merchantMasterApi.get(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
};
