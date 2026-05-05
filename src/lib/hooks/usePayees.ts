import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payeesApi, Payee } from '@/lib/api/payees';

export const usePayees = (search?: string, page?: number, limit?: number) => {
  return useQuery({
    queryKey: ['payees', search, page, limit],
    queryFn: () => payeesApi.getAll(search, page, limit),
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const usePayee = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['payee', id],
    queryFn: () => payeesApi.getById(id),
    enabled: enabled && !!id,
  });
};

export const useCreatePayee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; iconSlug?: string; details?: any }) =>
      payeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payees'] });
    },
  });
};

export const useUpdatePayee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; iconSlug?: string; details?: any } }) =>
      payeesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payees'] });
      queryClient.invalidateQueries({ queryKey: ['payee', variables.id] });
    },
  });
};

export const useDeletePayee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payees'] });
    },
  });
};
