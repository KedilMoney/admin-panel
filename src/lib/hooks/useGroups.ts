import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '@/lib/api/groups';
import { Group } from '@/types';

export const useGroups = () => {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getAll(),
  });
};

export const useGroup = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsApi.getById(id),
    enabled: enabled && !!id,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: FormData) => groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => 
      groupsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', variables.id] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, toCategoryId }: { id: string; toCategoryId?: string }) => 
      groupsApi.delete(id, toCategoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

