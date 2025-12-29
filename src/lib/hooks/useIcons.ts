import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { iconsApi } from '@/lib/api/icons';
import { Icon } from '@/types';

export const useIcons = (search?: string) => {
  return useQuery({
    queryKey: ['icons', search],
    queryFn: () => iconsApi.getAll(search),
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data exists
  });
};

export const useIcon = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['icon', id],
    queryFn: () => iconsApi.getById(id),
    enabled: enabled && !!id,
  });
};

export const useCreateIcon = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: FormData) => iconsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['icons'] });
    },
  });
};

export const useUpdateIcon = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => 
      iconsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['icons'] });
      queryClient.invalidateQueries({ queryKey: ['icon', variables.id] });
    },
  });
};

export const useDeleteIcon = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => iconsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['icons'] });
    },
  });
};

