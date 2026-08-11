import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  rewardValueRatesApi,
  RewardValueRateFilters,
  RewardValueRateInput,
} from '@/lib/api/rewardValueRates';

export const useRewardValueRates = (filters: RewardValueRateFilters = {}) => {
  return useQuery({
    queryKey: ['reward-value-rates', filters],
    queryFn: () => rewardValueRatesApi.list(filters),
  });
};

export const useCreateRewardValueRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RewardValueRateInput) => rewardValueRatesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-value-rates'] });
    },
  });
};

export const useUpdateRewardValueRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RewardValueRateInput> }) =>
      rewardValueRatesApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-value-rates'] });
    },
  });
};

export const useDeleteRewardValueRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rewardValueRatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-value-rates'] });
    },
  });
};
