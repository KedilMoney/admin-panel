import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminApi,
  BudgetTemplateGroup,
  SystemCategoryTagRow,
} from '@/lib/api/admin';

export const useUserStats = () => {
  return useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: () => adminApi.getUserStats(),
    refetchInterval: 60_000,
  });
};

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

export const useCategoryReviewSummary = () => {
  return useQuery({
    queryKey: ['admin-category-review-summary'],
    queryFn: () => adminApi.getCategoryReviewSummary(),
  });
};

export const useCategoryReview = (
  categoryName: string | null,
  sort: 'suspect' | 'date' = 'suspect'
) => {
  return useQuery({
    queryKey: ['admin-category-review', categoryName, sort],
    queryFn: () =>
      adminApi.getCategoryReview({
        categoryName: categoryName as string,
        limit: 200,
        sort,
      }),
    enabled: Boolean(categoryName),
  });
};

export const useCategoryReviewDiagnosis = (transactionId: string | null) => {
  return useQuery({
    queryKey: ['admin-category-review-diagnosis', transactionId],
    queryFn: () => adminApi.getCategoryReviewDiagnosis(transactionId as string),
    enabled: Boolean(transactionId),
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

export const useProvisionBudgetTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminApi.provisionBudgetTemplate(),
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

