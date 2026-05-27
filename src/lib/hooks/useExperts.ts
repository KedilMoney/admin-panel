import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expertsApi } from '@/lib/api/experts';
import { ExpertFormData } from '@/types';

export const useExperts = () => {
  return useQuery({
    queryKey: ['experts'],
    queryFn: () => expertsApi.getAll(),
  });
};

export const useCreateExpert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExpertFormData) => expertsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experts'] });
    },
  });
};

export const useUpdateExpert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpertFormData }) => expertsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experts'] });
    },
  });
};

export const useToggleExpert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expertsApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experts'] });
    },
  });
};

export const useDeleteExpert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expertsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experts'] });
    },
  });
};
