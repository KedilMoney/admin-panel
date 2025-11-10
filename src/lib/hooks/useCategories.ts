import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api/categories';
import { Category, DashboardData } from '@/types';

export const useCategories = (params?: { startDate?: string; endDate?: string; epoch?: number }) => {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: () => categoriesApi.getAll(params),
  });
};

export const useCategory = (id: string, params?: { epoch?: number }, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['category', id, params],
    queryFn: () => categoriesApi.getById(id, params),
    enabled: enabled && !!id,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: FormData) => 
      categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => 
      categoriesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', variables.id] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, toCategoryId }: { id: string; toCategoryId?: string }) => 
      categoriesApi.delete(id, toCategoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useDashboard = (data: { fromDate: string; toDate: string; search?: string; groupId?: string }, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['dashboard', data],
    queryFn: () => categoriesApi.dashboard(data),
    enabled,
  });
};

export const useCategorySearch = (data: { page: number; size: number; fromDate: string; toDate: string; search?: string; groupId?: string }, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['categorySearch', data],
    queryFn: () => categoriesApi.search(data),
    enabled,
  });
};

