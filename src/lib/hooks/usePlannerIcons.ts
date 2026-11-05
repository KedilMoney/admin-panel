import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plannerIconsApi } from '@/lib/api/plannerIcons';
import { PlannerIconInput } from '@/types';

export const usePlannerIcons = (enabled: boolean) => {
  return useQuery({
    queryKey: ['planner-icons'],
    queryFn: () => plannerIconsApi.getAll(),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useCreatePlannerIcon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PlannerIconInput) => plannerIconsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner-icons'] }),
  });
};

export const useUpdatePlannerIcon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: Omit<PlannerIconInput, 'slug'> }) =>
      plannerIconsApi.update(slug, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner-icons'] }),
  });
};

export const useDeletePlannerIcon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => plannerIconsApi.delete(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner-icons'] }),
  });
};
