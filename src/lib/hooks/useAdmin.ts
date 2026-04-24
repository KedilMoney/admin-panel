import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminApi,
  BudgetTemplateGroup,
  SystemCategoryTagRow,
} from '@/lib/api/admin';

export const useAdminOnboarding = () => {
  return useQuery({
    queryKey: ['admin-onboarding'],
    queryFn: () => adminApi.getOnboarding(),
  });
};

export const useCategoryUsage = () => {
  return useQuery({
    queryKey: ['admin-category-usage'],
    queryFn: () => adminApi.getCategoryUsage(),
  });
};

export const useGroupUsage = () => {
  return useQuery({
    queryKey: ['admin-group-usage'],
    queryFn: () => adminApi.getGroupUsage(),
  });
};

export const useBudgetTemplate = () => {
  return useQuery({
    queryKey: ['admin-budget-template'],
    queryFn: () => adminApi.getBudgetTemplate(),
  });
};

export const useUpdateBudgetTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (template: BudgetTemplateGroup[]) => adminApi.updateBudgetTemplate(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-budget-template'] });
    },
  });
};

export const useCategoryTags = () => {
  return useQuery({
    queryKey: ['admin-category-tags'],
    queryFn: () => adminApi.getCategoryTags(),
    staleTime: 60 * 1000,
  });
};

export const useUpdateCategoryTags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categories: SystemCategoryTagRow[]) =>
      adminApi.updateCategoryTags(categories),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-category-tags'], data);
      queryClient.invalidateQueries({ queryKey: ['admin-category-tags'] });
    },
  });
};

